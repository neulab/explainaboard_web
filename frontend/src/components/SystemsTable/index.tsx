import React, { useEffect, useState } from "react";
import "./index.css";
import { message, Space } from "antd";
import { SystemSubmitDrawer, AnalysisDrawer } from "../../components";
import { backendClient, parseBackendError } from "../../clients";
import { SystemModel, newSystemModel } from "../../models/SystemModel";
import { Filter, SystemTableTools } from "./SystemTableTools";
import { SystemTableContent } from "./SystemTableContent";
import { findTask, PageState } from "../../utils";
import { TaskCategory } from "../../clients/openapi";
import { LoginState, useUser } from "../useUser";

interface Props {
  /**initial value for task filter */
  initialTaskFilter?: string;
  dataset?: string;
  subdataset?: string;
}

/** A table that lists all systems */
export function SystemsTable({
  initialTaskFilter,
  dataset,
  subdataset,
}: Props) {
  const [pageState, setPageState] = useState(PageState.loading);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [systems, setSystems] = useState<SystemModel[]>([]);
  const [total, setTotal] = useState(0);

  // filters
  const [nameFilter, setNameFilter] = useState("");
  const [taskFilter, setTaskFilter] = useState(initialTaskFilter);
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [split, setSplit] = useState<string>("all");

  // submit
  const [submitDrawerVisible, setSubmitDrawerVisible] = useState(false);

  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);

  const [refreshTrigger, setRefreshTrigger] = useState(false);

  // systems selected in the table
  const [selectedSystemIDs, setSelectedSystemIDs] = useState<string[]>([]);

  // systems to be analyzed
  const [activeSystemIDs, setActiveSystemIDs] = useState<string[]>([]);

  const { state: loginState } = useUser();

  /** generate metrics options list */
  function getMetricsNames() {
    const metricNames = new Set<string>();
    for (const sys of systems) {
      Object.keys(sys.system_info.results.overall).forEach((name) =>
        metricNames.add(name)
      );
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
      const datasetSplit = split === "all" ? undefined : split;
      try {
        const { systems: newSystems, total: newTotal } =
          await backendClient.systemsGet(
            nameFilter || undefined,
            taskFilter,
            dataset || undefined,
            subdataset || undefined,
            datasetSplit || undefined,
            page,
            pageSize,
            sortField,
            sortDir
          );
        setSystems(newSystems.map((sys) => newSystemModel(sys)));
        setTotal(newTotal);
        setPageState(PageState.success);
      } catch (e) {
        console.error(e);
        if (e instanceof Response) {
          const error = await parseBackendError(e);
          message.error(error.getErrorMsg());
        }
        setPageState(PageState.error);
      }
    }
    if (loginState !== LoginState.loading) refreshSystems();
  }, [
    nameFilter,
    taskFilter,
    dataset,
    subdataset,
    split,
    page,
    pageSize,
    sortField,
    sortDir,
    refreshTrigger,
    loginState, // refresh when login state changes
  ]);

  /** TODO: add debounce */
  function onFilterChange({
    name,
    task,
    sortField: newSortField,
    sortDir: newSortDir,
    split: newSplit,
  }: Partial<Filter>) {
    if (name != null) setNameFilter(name);
    if (task != null) setTaskFilter(task || undefined);
    if (newSortField != null) setSortField(newSortField);
    if (newSortDir != null) setSortDir(newSortDir);
    if (newSplit != null) setSplit(newSplit);
    setPage(0);
    setSelectedSystemIDs([]);
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <SystemTableTools
        systems={systems}
        toggleSubmitDrawer={() => setSubmitDrawerVisible((visible) => !visible)}
        taskCategories={taskCategories}
        value={{
          task: taskFilter,
          name: nameFilter,
          sortField,
          sortDir,
          split,
        }}
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
        setActiveSystemIDs={setActiveSystemIDs}
      />
      <AnalysisDrawer
        visible={activeSystemIDs.length !== 0}
        systems={systems}
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
