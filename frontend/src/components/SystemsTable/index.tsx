import React, { useState } from "react";
import "./index.css";
import { Button, Drawer, Space, Table, Tag, Tooltip, Typography } from "antd";
import { System } from "../../clients/openapi";
import { ColumnsType } from "antd/lib/table";
import { AnalysisReport } from "../../components";

interface Props {
  systems: System[];
  total: number;
  pageSize: number;
  /** 0 indexed */
  page: number;
  loading: boolean;
  onPageChange: (newPage: number, newPageSize: number | undefined) => void;
}

/** A table that lists all systems */
export function SystemsTable({
  systems,
  page,
  total,
  pageSize,
  loading,
  onPageChange,
}: Props) {
  const [activeSystemID, setActiveSystemID] = useState<string>();
  const activeSystem = systems.find((sys) => sys.system_id === activeSystemID);

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
    <div>
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
          onChange: onPageChange,
        }}
        sticky
        loading={loading}
      />
      <Drawer
        visible={activeSystemID != null}
        onClose={() => closeSystemAnalysis()}
        title={activeSystem?.model_name + " Analysis Report"}
        width="80%"
      >
        {activeSystem?.analysis !== undefined && (
          <AnalysisReport analysis={activeSystem?.analysis} />
        )}
      </Drawer>
    </div>
  );
}