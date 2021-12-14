import React, { useEffect, useState } from "react";
import "./index.css";
import { PageHeader } from "antd";
import { useHistory, useParams } from "react-router-dom";
import { System } from "../../clients/openapi";
import { SystemsTable } from "../../components";
import { PageState } from "../../utils";
import { backendClient } from "../../clients";

/**
 * TODO:
 * 1. handle task name not valid
 */
export function LeaderboardPage() {
  const history = useHistory();
  const { task } = useParams<{ task: string }>();

  const [pageState, setPageState] = useState(PageState.loading);
  const [systems, setSystems] = useState<System[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function refreshSystems() {
      setPageState(PageState.loading);
      const { systems: newSystems, total } = await backendClient.systemsGet(
        undefined,
        task,
        page,
        pageSize
      );
      setSystems(newSystems);
      setTotal(total);
      setPageState(PageState.success);
    }
    refreshSystems();
  }, [task, page, pageSize]);

  return (
    <div>
      <PageHeader
        onBack={() => history.goBack()}
        title={task + " Leaderboard"}
        subTitle={`Leaderboard for ${task}`}
      />
      <SystemsTable
        systems={systems}
        loading={pageState === PageState.loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(newPage, newPageSize) => {
          setPage(newPage - 1);
          if (newPageSize) setPageSize(newPageSize);
        }}
      />
    </div>
  );
}
