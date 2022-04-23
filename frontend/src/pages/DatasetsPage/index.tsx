import React, { useEffect, useState } from "react";
import {
  Divider,
  Input,
  PageHeader,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import "./index.css";
import { ColumnsType } from "antd/lib/table";
import { DatasetMetadata } from "../../clients/openapi";
import { backendClient } from "../../clients";
import {
  generateDataLabURL,
  generateLeaderboardURL,
  PageState,
} from "../../utils";
import { useHistory } from "react-router";
import { Link } from "react-router-dom";

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
        undefined,
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
    dataIndex: "sub_dataset",
    title: "Subdataset",
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
    dataIndex: "",
    title: "Leaderboard",
    render: (_, record) => (
      <Typography.Link href={""} target="_blank">
        <Link
          to={generateLeaderboardURL(record.dataset_name, record.sub_dataset)}
        >
          Leaderboard
        </Link>
      </Typography.Link>
    ),
  },
  {
    dataIndex: "links",
    title: "Links",
    render: (_, record) => (
      <>
        <Typography.Link
          href={generateDataLabURL(record.dataset_id)}
          target="_blank"
        >
          DataLab
        </Typography.Link>
        <Divider type="vertical" />
        <Typography.Link
          href={record.huggingface_link}
          target="_blank"
          disabled={!record.huggingface_link}
        >
          Hugging Face
        </Typography.Link>
      </>
    ),
  },
];
