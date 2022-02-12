import React, { useEffect, useState } from "react";
import "./index.css";
import { Space } from "antd";
import { SystemSubmitDrawer } from "../../components";
import { backendClient } from "../../clients";
import { SystemModel, newSystemModel } from "../../models/SystemModel";
import { Filter, SystemTableTools } from "./SystemTableTools";
import { SystemTableContent } from "./SystemTableContent";
import { findTask, PageState } from "../../utils";
import { TaskCategory } from "../../clients/openapi";

interface Props {
  /**initial value for task filter */
  initialTaskFilter?: string;
}
/** A table that lists all systems */
export function SystemsTable({ initialTaskFilter }: Props) {
  const [systems, setSystems] = useState<SystemModel[]>([]);
  const [pageState, setPageState] = useState(PageState.loading);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // filters
  const [nameFilter, setNameFilter] = useState("");
  const [taskFilter, setTaskFilter] = useState(initialTaskFilter);
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // submit
  const [submitDrawerVisible, setSubmitDrawerVisible] = useState(false);

  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);

  const [refreshTrigger, setRefreshTrigger] = useState(false);

  // systems selected in the table
  const [selectedSystemIDs, setSelectedSystemIDs] = useState<string[]>([]);
  // systems to be analyzed
  const [activeSystemIDs, setActiveSystemIDs] = useState<string[]>([]);

  /** generate metrics options list */
  function getMetricsNames() {
    const metricNames = new Set<string>();
    for (const sys of systems) {
      sys.analysis.getMetricNames().forEach((name) => metricNames.add(name));
    }
    // if a task is selected, add all supported metrics to the options list
    if (taskFilter) {
      const task = findTask(taskCategories, taskFilter);
      if (task)
        task.supported_metrics.forEach((metric) => metricNames.add(metric));
    }
    return Array.from(metricNames);
  }
  const metricNames = getMetricsNames();

  useEffect(() => {
    function getInitialSortField(taskCategories: TaskCategory[]) {
      if (initialTaskFilter) {
        const initialTask = findTask(taskCategories, initialTaskFilter);
        if (initialTask && initialTask.supported_metrics.length > 0)
          return initialTask.supported_metrics[0];
      }
      return "created_at";
    }
    async function fetchTasks() {
      const taskCategoriesData = await backendClient.tasksGet();
      setTaskCategories(taskCategoriesData);
      setSortField(getInitialSortField(taskCategoriesData));
    }
    fetchTasks();
  }, [initialTaskFilter]);

  useEffect(() => {
    async function refreshSystems() {
      setPageState(PageState.loading);
      const { systems: newSystems, total } = await backendClient.systemsGet(
        nameFilter || undefined,
        taskFilter,
        page,
        pageSize,
        sortField,
        sortDir
      );
      const datasetIDs: string[] = [];
      for (const sys of newSystems) {
        if (sys.dataset_metadata_id !== undefined) {
          datasetIDs.push(sys.dataset_metadata_id);
        }
      }
      const { datasets } = await backendClient.datasetsGet(
        datasetIDs.join(",")
      );
      // gather datasets into a dictionary with datasetID as key for easy look up
      const normalizedDatasets = Object.assign(
        {},
        ...datasets.map((d) => ({ [d.dataset_id]: d }))
      );
      setSystems(
        newSystems.map((sys) => {
          const datasetName =
            sys.dataset_metadata_id === undefined
              ? "unspecified"
              : normalizedDatasets[sys.dataset_metadata_id].dataset_name;
          return newSystemModel(sys, datasetName);
        })
      );
      setTotal(total);
      setPageState(PageState.success);
    }
    refreshSystems();
  }, [
    nameFilter,
    taskFilter,
    page,
    pageSize,
    sortField,
    sortDir,
    refreshTrigger,
  ]);

  /** TODO: add debounce */
  function onFilterChange({
    name,
    task,
    sortField: newSortField,
    sortDir: newSortDir,
  }: Partial<Filter>) {
    if (name != null) setNameFilter(name);
    if (task != null) setTaskFilter(task || undefined);
    if (newSortField != null) setSortField(newSortField);
    if (newSortDir != null) setSortDir(newSortDir);
    setPage(0);
    setSelectedSystemIDs([]);
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <SystemTableTools
        toggleSubmitDrawer={() => setSubmitDrawerVisible((visible) => !visible)}
        taskCategories={taskCategories}
        value={{ task: taskFilter, name: nameFilter, sortField, sortDir }}
        onChange={onFilterChange}
        metricOptions={metricNames}
        selectedSystemIDs={selectedSystemIDs}
        setActiveSystemIDs={setActiveSystemIDs}
      />
      <SystemTableContent
        systems={systems}
        page={page}
        total={total}
        pageSize={pageSize}
        loading={pageState === PageState.loading}
        onPageChange={(newPage, newPageSize) => {
          setPage(newPage);
          if (newPageSize) setPageSize(newPageSize);
          setSelectedSystemIDs([]);
        }}
        metricNames={metricNames}
        selectedSystemIDs={selectedSystemIDs}
        setSelectedSystemIDs={setSelectedSystemIDs}
        activeSystemIDs={activeSystemIDs}
        setActiveSystemIDs={setActiveSystemIDs}
      />
      <SystemSubmitDrawer
        visible={submitDrawerVisible}
        onClose={() => {
          setSubmitDrawerVisible(false);
          setRefreshTrigger((value) => !value);
        }}
      />
    </Space>
  );
}
