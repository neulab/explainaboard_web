import React, { useEffect, useState } from "react";
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

  // system to be edited
  const [systemIDToEdit, setSystemIDToEdit] = useState<string>("");
  const systemsToEdit = systems.filter(
    (sys) => systemIDToEdit === sys.system_id
  );
  const systemToEdit = systemsToEdit.length < 1 ? undefined : systemsToEdit[0];

  const { state: loginState, userInfo } = useUser();
  const userId = userInfo?.id;

  /** generate metrics options list. Metric names use the pattern
   *  `${analysisLevel}.{metricName}`. */
  function getMetricsNames(): string[] {
    const metricNames = new Set<string>();
    for (const sys of systems) {
      for (const [level, metrics] of Object.entries(sys.results)) {
        Object.keys(metrics).forEach((name) =>
          metricNames.add(`${level}.${name}`)
        );
      }
    }
    // if a task is selected, add all supported metrics to the options list
    if (filters.task) {
      const task = findTask(taskCategories, filters.task);
      if (task)
        // The backend only returns metric names for the example level so it is
        // hardcoded here. This should be fixed in the future.
        task.supported_metrics.forEach((metricName) =>
          metricNames.add(`example.${metricName}`)
        );
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
  const onFilterChange = function (updates: FilterUpdate) {
    /* When task filter changes, also reset the ordering */
    function getInitialSortField(
      taskCategories: TaskCategory[],
      taskFilter: string
    ) {
      if (taskFilter) {
        const initialTask = findTask(taskCategories, taskFilter);
        if (initialTask && initialTask.supported_metrics.length > 0) {
          return `example.${initialTask.supported_metrics[0]}`;
        }
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

    setFilters(filters.update(updates));
    setPage(0);
    setSelectedSystemIDs([]);
  };

  useEffect(() => {
    async function refreshSystems() {
      setPageState(PageState.loading);

      const datasetSplit = filters.split === "all" ? undefined : filters.split;
      const creator = filters.showMine ? userId : undefined;
      try {
        const { systems: newSystems, total: newTotal } =
          await backendClient.systemsGet(
            filters.name,
            filters.task,
            filters.dataset,
            filters.subdataset,
            datasetSplit,
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
    userId,
    loginState, // refresh when login state changes
  ]);

  function showSubmitDrawer() {
    setSubmitDrawerVisible(true);
  }

  function showEditDrawer(systemIDToEdit: string) {
    setSystemIDToEdit(systemIDToEdit);
    setSubmitDrawerVisible(true);
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <SystemTableTools
        systems={systems}
        showSubmitDrawer={showSubmitDrawer}
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
        showEditDrawer={showEditDrawer}
      />
      <AnalysisDrawer
        systems={systems.filter((sys) =>
          activeSystemIDs.includes(sys.system_id)
        )}
        closeDrawer={() => onActiveSystemChange([])}
      />
      <SystemSubmitDrawer
        systemToEdit={systemToEdit}
        visible={submitDrawerVisible}
        onClose={() => {
          setSystemIDToEdit("");
          setSubmitDrawerVisible(false);
          setRefreshTrigger((value) => !value);
        }}
      />
    </Space>
  );
}
