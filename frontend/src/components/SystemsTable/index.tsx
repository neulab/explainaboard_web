import React, { useState } from "react";
import "./index.css";
import {
  Button,
  Drawer,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { System } from "../../clients/openapi";
import { ColumnsType } from "antd/lib/table";
import { AnalysisReport } from "../../components";
import { backendClient, parseBackendError } from "../../clients";
import { DeleteOutlined } from "@ant-design/icons";

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

  async function deleteSystem(systemID: string) {
    try {
      await backendClient.systemsSystemIdDelete(systemID);
      message.success("Success");
      document.location.reload();
    } catch (e) {
      if (e instanceof Response) {
        message.error((await parseBackendError(e)).getErrorMsg());
      }
    }
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
      fixed: "right",
      width: 210,
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
          <Popconfirm
            title="Are you sure?"
            onConfirm={() => deleteSystem(record.system_id)}
          >
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
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
        rowKey="system_id"
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
        scroll={{ x: "100%" }}
      />
      <Drawer
        visible={activeSystemID != null}
        onClose={() => closeSystemAnalysis()}
        title={activeSystem?.model_name + " Analysis Report"}
        width="80%"
      >
        {activeSystem?.analysis !== undefined &&
          activeSystemID !== undefined && (
            <AnalysisReport
              systemID={activeSystemID}
              analysis={activeSystem?.analysis}
            />
          )}
      </Drawer>
    </div>
  );
}
