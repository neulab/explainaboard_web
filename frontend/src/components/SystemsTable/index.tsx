import React, { useCallback, useEffect, useState } from "react";
import "./index.css";
import { message, Space } from "antd";
import { SystemSubmitDrawer, AnalysisDrawer } from "../../components";
import { backendClient, parseBackendError } from "../../clients";
import { SystemModel, newSystemModel } from "../../models";
import { SystemTableTools } from "./SystemTableTools";
import { SystemTableContent } from "./SystemTableContent";
import { findTask, PageState } from "../../utils";
import { TaskCategory } from "../../clients/openapi";
import { LoginState, useUser } from "../useUser";
import { useHistory } from "react-router-dom";
import useQuery from "../useQuery";
import { FilterUpdate, SystemFilter } from "./SystemFilter";

/** A table that lists all systems */
export function SystemsTable() {
  const [pageState, setPageState] = useState(PageState.loading);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const history = useHistory();

  const [systems, setSystems] = useState<SystemModel[]>([]);
  const [total, setTotal] = useState(0);
  const query = useQuery();
  const [filters, setFilters] = useState<SystemFilter>(
    SystemFilter.parseQueryToFilter(query)
  );

  const [activeSystemIDs, setActiveSystemIds] = useState<string[]>([]);

  useEffect(() => {
    const prevString = query.toString();
    const newString = filters.toUrlParams().toString();
    if (prevString !== newString) {
      history.push({ search: filters.toUrlParams().toString() });
    }
  }, [history, filters, query]);

  const updateFilterAndQuery = useCallback(
    (currFilters: SystemFilter, updates: FilterUpdate) => {
      const updated = currFilters.update(updates);
      if (updated) {
        setFilters(new SystemFilter(currFilters));
      }
    },
    []
  );

  // submit
  const [submitDrawerVisible, setSubmitDrawerVisible] = useState(false);

  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);

  const [refreshTrigger, setRefreshTrigger] = useState(false);

  // systems selected in the table
  const [selectedSystemIDs, setSelectedSystemIDs] = useState<string[]>([]);

  // set systems to be analyzed
  const onActiveSystemChange = (ids: string[]) => {
    setActiveSystemIds(ids);
  };

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
    if (filters.task) {
      const task = findTask(taskCategories, filters.task);
      if (task)
        task.supported_metrics.forEach((metric) => metricNames.add(metric));
    }
    return Array.from(metricNames);
  }
  const metricNames = getMetricsNames();

  /* Fetch all tasks from backend during page initialization */
  useEffect(() => {
    async function fetchTasks() {
      const taskCategoriesData = await backendClient.tasksGet();
      setTaskCategories(taskCategoriesData);
    }
    fetchTasks();
  }, []);

  /** TODO: add debounce */
  const onFilterChange = useCallback(
    function (updates: FilterUpdate) {
      /* When task filter changes, also reset the ordering */
      function getInitialSortField(
        taskCategories: TaskCategory[],
        taskFilter: string
      ) {
        if (taskFilter) {
          const initialTask = findTask(taskCategories, taskFilter);
          if (initialTask && initialTask.supported_metrics.length > 0)
            return initialTask.supported_metrics[0];
        }
        return "created_at";
      }

      if (updates.task) {
        const initialSortField = getInitialSortField(
          taskCategories,
          updates.task
        );
        updates.sortField = initialSortField;
      }
      updateFilterAndQuery(filters, updates);
      setPage(0);
      setSelectedSystemIDs([]);
    },
    [taskCategories, filters, updateFilterAndQuery]
  );

  useEffect(() => {
    async function refreshSystems() {
      setPageState(PageState.loading);
      const datasetSplit = filters.split === "all" ? undefined : filters.split;
      const creator = filters.showMine ? userEmail : undefined;
      try {
        const { systems: newSystems, total: newTotal } =
          await backendClient.systemsGet(
            filters.name || undefined,
            filters.task,
            filters.dataset || undefined,
            filters.subdataset || undefined,
            datasetSplit || undefined,
            page,
            pageSize,
            filters.sortField,
            filters.sortDir,
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
    filters,
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
        value={filters}
        onChange={onFilterChange}
        metricOptions={metricNames}
        selectedSystemIDs={selectedSystemIDs}
        onActiveSystemChange={onActiveSystemChange}
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
        onActiveSystemChange={onActiveSystemChange}
      />
      <AnalysisDrawer
        systems={systems.filter((sys) =>
          activeSystemIDs.includes(sys.system_id)
        )}
        closeDrawer={() => onActiveSystemChange([])}
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
