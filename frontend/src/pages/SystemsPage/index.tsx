import React, { useEffect, useState } from "react";
import { Button, Input, PageHeader, Space } from "antd";
import { useHistory } from "react-router-dom";
import { backendClient } from "../../clients";
import { System } from "../../clients/openapi";
import { SystemsTable, SystemSubmitDrawer } from "../../components";
import { PageState } from "../../utils";
import "./index.css";

/**
 * Systems Page
 * TODO:
 * 1. debounce search
 */
export function SystemsPage() {
  const [pageState, setPageState] = useState(PageState.loading);
  const [systems, setSystems] = useState<System[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const history = useHistory();

  const [submitDrawerVisible, setSubmitDrawerVisible] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(false);

  // filters
  const [nameQuery, setNameQuery] = useState("");

  function searchName(text: string) {
    setNameQuery(text);
    setPage(0);
  }

  useEffect(() => {
    async function refreshSystems() {
      setPageState(PageState.loading);
      const { systems: newSystems, total } = await backendClient.systemsGet(
        nameQuery ? nameQuery : undefined,
        undefined,
        page,
        pageSize
      );
      setSystems(newSystems);
      setTotal(total);
      setPageState(PageState.success);
    }
    refreshSystems();
  }, [page, pageSize, refreshTrigger, nameQuery]);

  function resetFiltersAndRefresh() {
    setPage(0);
    setRefreshTrigger(!refreshTrigger);
  }

  return (
    <div className="page">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <PageHeader
          onBack={() => history.goBack()}
          title="Systems"
          subTitle="All systems submitted by users"
          className="header"
        />
        <Space>
          <Input.Search
            placeholder="Search by system name"
            value={nameQuery}
            onChange={(e) => searchName(e.target.value)}
          />
          <Button type="primary" onClick={() => setSubmitDrawerVisible(true)}>
            New
          </Button>
        </Space>
      </div>

      <SystemsTable
        total={total}
        page={page}
        pageSize={pageSize}
        loading={pageState === PageState.loading}
        systems={systems}
        onPageChange={(newPage, newPageSize) => {
          setPage(newPage - 1);
          if (newPageSize) setPageSize(newPageSize);
        }}
      />

      <SystemSubmitDrawer
        visible={submitDrawerVisible}
        onClose={() => {
          setSubmitDrawerVisible(false);
          resetFiltersAndRefresh();
        }}
      />
    </div>
  );
}
