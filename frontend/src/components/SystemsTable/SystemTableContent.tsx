import React, { useEffect, useState } from "react";
import {
  Button,
  message,
  Popconfirm,
  Space,
  Select,
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
import { DatasetMetadata } from "../../clients/openapi";
import { FilterUpdate, SystemFilter } from "./SystemFilter";
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
  onFilterChange: (value: FilterUpdate) => void;
  filterValue: SystemFilter;
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
  onFilterChange,
  filterValue,
}: Props) {
  const { userInfo } = useUser();
  const metricColumns: ColumnsType<SystemModel> = metricNames.map((metric) => ({
    dataIndex: ["results", ...metric.split(".")],
    title: metric,
    width: 135,
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

  const [datasets, setDatasets] = useState<{ label: string; value: string }[]>(
    []
  );
  const [datasetSearchText, setDatasetSearchText] = useState("");

  useEffect(() => {
    async function fetchDatasets() {
      const { datasets: newDatasets } = await backendClient.datasetsGet(
        undefined,
        datasetSearchText,
        undefined,
        0,
        30
      );
      const distinctNames = Array.from(
        new Set(
          newDatasets.map((dataset: DatasetMetadata) => dataset.dataset_name)
        )
      );
      setDatasets(
        distinctNames.map((name: string) => {
          return { label: name, value: name };
        })
      );
    }
    fetchDatasets();
  }, [datasetSearchText, filterValue.task]);

  const onDatasetSearch = (value: string) => {
    console.log("search:", value);
    setDatasetSearchText(value);
  };

  const onDatasetChange = (value: string) => {
    onFilterChange({ dataset: value });
  };

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
      filterDropdown: () => (
        <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
          <Select
            showSearch
            allowClear
            placeholder="Search dataset"
            onSearch={onDatasetSearch}
            onChange={onDatasetChange}
            value={filterValue.dataset}
            style={{ minWidth: "120px" }}
            options={datasets}
          />
        </div>
      ),
      filteredValue: filterValue.dataset ? [filterValue.dataset] : null,
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
      dataIndex: "preferred_username",
      title: "Creator",
      align: "center",
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
      dataIndex: "system_tags",
      title: "System Tags",
      render: (_, record) =>
        record.system_tags.map((tag) => <Tag key={tag}>{tag}</Tag>),
      width: 130,
      align: "center",
    },
    {
      dataIndex: "action",
      title: "",
      fixed: "right",
      width: 90,
      render: (_, record) => {
        const notCreator = record.creator !== userInfo?.id;
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
