import {
  Button,
  Drawer,
  PageHeader,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { ColumnsType } from "antd/lib/table";
import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { backendClient } from "../../clients";
import { System } from "../../clients/openapi";
import { SystemSubmitDrawer } from "../../components";
import { PageState } from "../../utils";
import "./index.css";

export function SystemsPage() {
  const [pageState, setPageState] = useState(PageState.loading);
  const [systems, setSystems] = useState<System[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const history = useHistory();

  const [activeSystemID, setActiveSystemID] = useState<string>();
  const activeSystem = systems.find((sys) => sys.system_id === activeSystemID);

  const [submitDrawerVisible, setSubmitDrawerVisible] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(false);

  useEffect(() => {
    async function refreshSystems() {
      setPageState(PageState.loading);
      const { systems: newSystems, total } = await backendClient.systemsGet(
        undefined,
        undefined,
        page,
        pageSize
      );
      setSystems(newSystems);
      setTotal(total);
      setPageState(PageState.success);
    }
    refreshSystems();
  }, [page, pageSize, refreshTrigger]);

  function resetFiltersAndRefresh() {
    setPage(0);
    setRefreshTrigger(!refreshTrigger);
  }

  function showSystemAnalysis(systemID: string) {
    setActiveSystemID(systemID);
  }

  function closeSystemAnalysis() {
    setActiveSystemID(undefined);
  }

  const columns: ColumnsType<System> = [
    {
      dataIndex: "idx",
      render: (text, record, index) => index + 1,
      width: 50,
      align: "center",
    },
    {
      dataIndex: "system_id",
      title: "ID",
      width: 230,
      render: (value) => (
        <Typography.Paragraph copyable style={{ marginBottom: 0 }}>
          {value}
        </Typography.Paragraph>
      ),
    },
    {
      dataIndex: "model_name",
      title: "Name",
    },
    {
      dataIndex: "task",
      title: "Task",
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      dataIndex: "language",
      title: "Language",
    },
    {
      dataIndex: "created_at",
      title: "Created At",
      render: (_, record) => record.created_at!.toString().split("T")[0], // TODO: make created_at required
    },
    {
      dataIndex: "action",
      title: "",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => showSystemAnalysis(record.system_id)}
          >
            Analysis
          </Button>
          <Tooltip title="not implemented">
            <Button size="small" disabled>
              Dataset Info
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

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
        <Button type="primary" onClick={() => setSubmitDrawerVisible(true)}>
          New
        </Button>
      </div>

      <Table
        className="table"
        columns={columns}
        dataSource={systems}
        rowKey="datasetId"
        size="middle"
        pagination={{
          total,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} (total: ${total})`,
          pageSize,
          current: page + 1,
          onChange: (newPage, newPageSize) => {
            setPage(newPage - 1);
            if (newPageSize) setPageSize(newPageSize);
          },
        }}
        sticky
        loading={pageState === PageState.loading}
      />
      <Drawer
        visible={activeSystemID != null}
        onClose={() => closeSystemAnalysis()}
        title={activeSystem?.model_name + " Analysis Report"}
        width="60%"
      >
        <Typography.Paragraph code>
          {JSON.stringify(activeSystem?.analysis)}
        </Typography.Paragraph>
      </Drawer>
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
