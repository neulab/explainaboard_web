import React, { useEffect, useState } from "react";
import { Input, PageHeader, Space, Table, Tag, Typography } from "antd";
import "./index.css";
import { ColumnsType } from "antd/lib/table";
import { DatasetMetadata } from "../../clients/openapi";
import { backendClient } from "../../clients";
import { PageState } from "../../utils";
import { useHistory } from "react-router";

/**
 * Dataset Page
 * TODO:
 * 1. debounce for search by name
 * 2. filter by task
 */
export function DatasetsPage() {
  const [pageState, setPageState] = useState(PageState.loading);
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // filters
  const [nameQuery, setNameQuery] = useState("");

  const history = useHistory();

  useEffect(() => {
    async function refreshDatasets() {
      setPageState(PageState.loading);
      const { datasets: newDatasets, total } = await backendClient.datasetsGet(
        nameQuery ? nameQuery : undefined,
        undefined,
        page,
        pageSize
      );
      setDatasets(newDatasets);
      setTotal(total);
      setPageState(PageState.success);
    }
    refreshDatasets();
  }, [page, pageSize, nameQuery]);

  function searchName(text: string) {
    setNameQuery(text);
    setPage(0);
  }

  return (
    <div className="page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <PageHeader
          onBack={() => history.goBack()}
          title="Datasets"
          subTitle="A list of all supported datasets"
          className="header"
        />
        <Space>
          <Input.Search
            placeholder="Search by dataset name"
            value={nameQuery}
            onChange={(e) => searchName(e.target.value)}
          />
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={datasets}
        rowKey="dataset_id"
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
    </div>
  );
}

const columns: ColumnsType<DatasetMetadata> = [
  {
    dataIndex: "idx",
    render: (text, record, index) => index + 1,
    width: 50,
    align: "center",
  },
  {
    dataIndex: "dataset_id",
    title: "ID",
    width: 230,
    render: (value) => (
      <Typography.Paragraph copyable style={{ marginBottom: 0 }}>
        {value}
      </Typography.Paragraph>
    ),
  },
  {
    dataIndex: "dataset_name",
    title: "Name",
  },
  {
    dataIndex: "tasks",
    title: "Tasks",
    render: (value) => (
      <span>
        {value.map((task: string, i: number) => (
          <Tag key={i}>{task}</Tag>
        ))}
      </span>
    ),
  },
  {
    dataIndex: "huggingface_link",
    title: "Huggingface",
    render: (value) => (
      <Typography.Link ellipsis href={value} target="_blank">
        {value}
      </Typography.Link>
    ),
  },
];
