import React, { useState } from "react";
import {
  Button,
  message,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
  Table,
  Drawer,
} from "antd";
import { ColumnsType } from "antd/lib/table";
import { backendClient, parseBackendError } from "../../clients";
import { SystemModel } from "../../models";
import { DeleteOutlined } from "@ant-design/icons";
import { AnalysisReport } from "..";

interface Props {
  systems: SystemModel[];
  total: number;
  pageSize: number;
  /** 0 indexed */
  page: number;
  loading: boolean;
  onPageChange: (newPage: number, newPageSize: number | undefined) => void;
  metricNames: string[];
}

export function SystemTableContent({
  systems,
  page,
  total,
  pageSize,
  loading,
  onPageChange,
  metricNames,
}: Props) {
  const [activeSystemID, setActiveSystemID] = useState<string>();
  const activeSystem = systems.find((sys) => sys.system_id === activeSystemID);

  const metricColumns: ColumnsType<SystemModel> = metricNames.map((metric) => ({
    dataIndex: metric,
    render: (_, record) => record.analysis.getMetirc(metric)?.value,
    title: metric,
    width: 100,
    align: "center",
  }));

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
  const columns: ColumnsType<SystemModel> = [
    {
      dataIndex: "idx",
      render: (text, record, index) => index + 1,
      width: 50,
      fixed: "left",
      align: "center",
    },
    {
      dataIndex: "model_name",
      width: 100,
      fixed: "left",
      title: "Name",
    },
    {
      dataIndex: "task",
      width: 150,
      fixed: "left",
      title: "Task",
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      dataIndex: "language",
      width: 100,
      title: "Language",
      align: "center",
    },
    ...metricColumns,
    {
      dataIndex: "created_at",
      title: "Created At",
      render: (_, record) => record.created_at.format("MM/DD/YYYY HH:mm"),
      width: 130,
      align: "center",
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
          onChange: (newPage, newPageSize) =>
            onPageChange(newPage - 1, newPageSize),
        }}
        sticky={false}
        loading={loading}
        scroll={{ x: 100 }}
      />
      <Drawer
        visible={activeSystemID != null}
        onClose={() => closeSystemAnalysis()}
        title={"Analysis report of " + activeSystem?.model_name}
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
