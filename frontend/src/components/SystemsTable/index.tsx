import React, { useCallback, useEffect, useState } from "react";
import "./index.css";
import { message, Space } from "antd";
import { SystemSubmitDrawer, AnalysisDrawer } from "../../components";
import { backendClient, parseBackendError } from "../../clients";
import { SystemModel, newSystemModel } from "../../models";
import { Filter, SystemTableTools } from "./SystemTableTools";
import { SystemTableContent } from "./SystemTableContent";
import { findTask, PageState } from "../../utils";
import { TaskCategory } from "../../clients/openapi";
import { LoginState, useUser } from "../useUser";
import { useHistory } from "react-router-dom";

const filterKeyMap = {
  nameFilter: "name",
  taskFilter: "task",
  showMine: "show_mine",
  sortField: "sort_field",
  sortDir: "sort_dir",
  dataset: "dataset",
  datasetSplit: "dataset_split",
  subdataset: "sub_dataset",
  systemId: "system_id",
};

interface Props {
  filters: URLSearchParams;
}

/** A table that lists all systems */
export function SystemsTable({ filters }: Props) {
  const [pageState, setPageState] = useState(PageState.loading);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const history = useHistory();

  const [systems, setSystems] = useState<SystemModel[]>([]);
  const [total, setTotal] = useState(0);

  // filters
  const nameFilter = filters.get(filterKeyMap.nameFilter) || undefined;
  const taskFilter = filters.get(filterKeyMap.taskFilter) || undefined;
  const showMine = filters.get(filterKeyMap.showMine) === "true" ? true : false;
  const sortDir = filters.get(filterKeyMap.sortDir) === "asc" ? "asc" : "desc";
  const sortField = filters.get(filterKeyMap.sortField) || "created_at";
  const split = filters.get(filterKeyMap.datasetSplit) || undefined;
  const systemId = filters.get(filterKeyMap.systemId) || undefined;
  const dataset = filters.get(filterKeyMap.dataset) || undefined;
  const subdataset = filters.get(filterKeyMap.subdataset) || undefined;

  // submit
  const [submitDrawerVisible, setSubmitDrawerVisible] = useState(false);

  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);

  const [refreshTrigger, setRefreshTrigger] = useState(false);

  // systems selected in the table
  const [selectedSystemIDs, setSelectedSystemIDs] = useState<string[]>([]);

  // systems to be analyzed
  const [activeSystemIDs, setActiveSystemIDs] = useState<string[]>([]);

  const { state: loginState, userInfo } = useUser();
  const userEmail = userInfo?.email;

  /** generate metrics options list */
  function getMetricsNames() {
    const metricNames = new Set<string>();
    for (const sys of systems) {
      for (const resultsLevel of sys.system_info.results.overall) {
        resultsLevel.forEach((name) => metricNames.add(name.metric_name));
      }
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

  const _setFilter = useCallback(
    function (filterName: string, value: string | undefined) {
      if (value) {
        filters.set(filterName, value);
      } else {
        filters.delete(filterName);
      }
    },
    [filters]
  );

  /** TODO: add debounce */
  const onFilterChange = useCallback(
    function ({
      name,
      task,
      showMine,
      sortField: newSortField,
      sortDir: newSortDir,
      split: newSplit,
    }: Partial<Filter>) {
      if (name != null) _setFilter(filterKeyMap.nameFilter, name);
      if (task != null) _setFilter(filterKeyMap.taskFilter, task || undefined);
      if (showMine != null)
        _setFilter(filterKeyMap.showMine, showMine ? "true" : "false");
      if (newSortField != null)
        _setFilter(filterKeyMap.sortField, newSortField || undefined);
      if (newSortDir != null)
        _setFilter(filterKeyMap.sortDir, newSortDir || undefined);
      if (newSplit != null)
        _setFilter(filterKeyMap.datasetSplit, newSplit || undefined);
      history.push({ search: filters.toString() });
      setPage(0);
      setSelectedSystemIDs([]);
    },
    [history, _setFilter, filters]
  );

  useEffect(() => {
    function getInitialSortField(taskCategories: TaskCategory[]) {
      if (taskFilter) {
        const initialTask = findTask(taskCategories, taskFilter);
        if (initialTask && initialTask.supported_metrics.length > 0)
          return initialTask.supported_metrics[0];
      }
      return "created_at";
    }
    async function fetchTasks() {
      const taskCategoriesData = await backendClient.tasksGet();
      setTaskCategories(taskCategoriesData);
      _setFilter(
        filterKeyMap.sortField,
        getInitialSortField(taskCategoriesData)
      );
    }
    fetchTasks();
  }, [taskFilter, _setFilter]);

  useEffect(() => {
    if (systemId) {
      setActiveSystemIDs(systemId.split(","));
    }
  }, [systemId]);

  useEffect(() => {
    async function refreshSystems() {
      setPageState(PageState.loading);
      const datasetSplit = split === "all" ? undefined : split;
      const creator = showMine ? userEmail : undefined;
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
            sortDir,
            creator
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
    dataset,
    nameFilter,
    showMine,
    sortDir,
    sortField,
    split,
    subdataset,
    taskFilter,
    page,
    pageSize,
    refreshTrigger,
    userEmail,
    loginState, // refresh when login state changes
  ]);

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <SystemTableTools
        systems={systems}
        toggleSubmitDrawer={() => setSubmitDrawerVisible((visible) => !visible)}
        taskCategories={taskCategories}
        value={{
          task: taskFilter,
          name: nameFilter,
          showMine: showMine,
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
        systems={systems.filter((sys) =>
          activeSystemIDs.includes(sys.system_id)
        )}
        closeDrawer={() => setActiveSystemIDs([])}
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
