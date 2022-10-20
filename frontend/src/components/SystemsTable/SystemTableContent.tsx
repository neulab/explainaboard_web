import React from "react";
import {
  Button,
  message,
  Popconfirm,
  Space,
  Table,
  Typography,
  Tag,
  Tooltip,
} from "antd";
import { ColumnsType } from "antd/lib/table";
import { backendClient, parseBackendError } from "../../clients";
import { SystemModel } from "../../models";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { PrivateIcon, useUser } from "..";
import { generateLeaderboardURL } from "../../utils";
import { getOverallMap } from "../Analysis/utils";
const { Text } = Typography;

interface Props {
  systems: SystemModel[];
  total: number;
  pageSize: number;
  /** 0 indexed */
  page: number;
  loading: boolean;
  onPageChange: (newPage: number, newPageSize: number | undefined) => void;
  metricNames: string[];
  selectedSystemIDs: string[];
  setSelectedSystemIDs: React.Dispatch<React.SetStateAction<string[]>>;
  onActiveSystemChange: (ids: string[]) => void;
  showEditDrawer: (systemIDToEdit: string) => void;
}

export function SystemTableContent({
  systems,
  page,
  total,
  pageSize,
  loading,
  onPageChange,
  metricNames,
  selectedSystemIDs,
  setSelectedSystemIDs,
  onActiveSystemChange,
  showEditDrawer,
}: Props) {
  const { userInfo } = useUser();
  const metricColumns: ColumnsType<SystemModel> = metricNames.map((metric) => ({
    dataIndex: metric,
    render: (_, record) =>
      getOverallMap(record.system_info.results.overall)[metric]?.value,
    title: metric,
    width: 100,
    ellipsis: true,
    align: "center",
  }));

  function showSystemAnalysis(systemID: string) {
    onActiveSystemChange([systemID]);
  }

  async function deleteSystem(systemID: string) {
    try {
      await backendClient.systemsDeleteById(systemID);
      message.success("Success");
      document.location.reload();
    } catch (e) {
      if (e instanceof Response) {
        message.error((await parseBackendError(e)).getErrorMsg());
      }
    }
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
      dataIndex: "system_name",
      fixed: "left",
      title: "Name",
      render: (_, record) => (
        <div>
          <Text strong>{record.system_name}</Text>
          {record.is_private && (
            <span style={{ paddingLeft: "3px" }}>
              <PrivateIcon />
            </span>
          )}
        </div>
      ),
      width: 150,
    },
    {
      dataIndex: "task",
      width: 120,
      fixed: "left",
      title: "Task",
      render: (value) => <Tag style={{ whiteSpace: "normal" }}>{value}</Tag>,
    },
    {
      dataIndex: "dataset_name",
      width: 110,
      title: "Dataset",
      fixed: "left",
      align: "center",
      render: (_, record) =>
        record.dataset?.dataset_name ? (
          <Tooltip title="view dataset leaderboard">
            <Typography.Link
              href={generateLeaderboardURL(
                record.dataset.dataset_name,
                record.dataset.sub_dataset,
                undefined
              )}
              target="_blank"
            >
              {record.dataset.dataset_name}
              {record.dataset.sub_dataset && ` (${record.dataset.sub_dataset})`}
            </Typography.Link>
          </Tooltip>
        ) : (
          "unspecified"
        ),
    },
    {
      dataIndex: ["dataset", "split"],
      width: 110,
      title: "Dataset Split",
      fixed: "left",
      align: "center",
    },
    {
      dataIndex: "source_language",
      width: 100,
      title: "Input Lang",
      align: "center",
    },
    {
      dataIndex: "target_language",
      width: 100,
      title: "Output Lang",
      align: "center",
    },
    ...metricColumns,
    {
      dataIndex: "creator",
      title: "Creator",
      align: "center",
      render: (value) => value.split("@")[0],
      width: 95,
    },
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
      width: 90,
      render: (_, record) => {
        const notCreator = record.creator !== userInfo?.email;
        return (
          <Space size="small" direction="vertical">
            <Space size="small">
              <Button
                size="small"
                onClick={() => showSystemAnalysis(record.system_id)}
              >
                Analysis
              </Button>
            </Space>
            <Space size="small">
              <Button
                size="small"
                disabled={notCreator}
                icon={<EditOutlined />}
                onClick={() => {
                  showEditDrawer(record.system_id);
                }}
              />
              <Popconfirm
                disabled={notCreator}
                title="Are you sure?"
                onConfirm={() => deleteSystem(record.system_id)}
              >
                <Button
                  danger
                  disabled={notCreator}
                  size="small"
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            </Space>
          </Space>
        );
      },
    },
  ];

  // rowSelection object indicates the need for row selection
  const rowSelection = {
    selectedRowKeys: selectedSystemIDs,
    onChange: (selectedRowKeys: React.Key[], selectedRows: SystemModel[]) => {
      setSelectedSystemIDs(selectedRowKeys as string[]);
    },
  };

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
        rowSelection={{
          type: "checkbox",
          ...rowSelection,
        }}
      />
    </div>
  );
}
