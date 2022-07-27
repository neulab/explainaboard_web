import React, { useEffect, useState } from "react";
import { Input, PageHeader, Space, Table, Tag, Typography } from "antd";
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
import { useGoogleAnalytics } from "../../components/useGoogleAnalytics";
import { Helmet } from "react-helmet";
import { ModalForImportTip } from "../../components/DatasetComponent";

/**
 * Dataset Page
 * TODO:
 * 1. debounce for search by name
 * 2. filter by task
 */
export function DatasetsPage() {
  useGoogleAnalytics();
  const [pageState, setPageState] = useState(PageState.loading);
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // filters
  const [nameQuery, setNameQuery] = useState("");

  const [nameTaskQuery, setNameTaskQuery] = useState("");

  const history = useHistory();

  useEffect(() => {
    async function refreshDatasets() {
      setPageState(PageState.loading);
      const { datasets: newDatasets, total } = await backendClient.datasetsGet(
        undefined,
        nameQuery ? nameQuery : undefined,
        nameTaskQuery ? nameTaskQuery : undefined,
        page,
        pageSize
      );
      setDatasets(newDatasets);
      setTotal(total);
      setPageState(PageState.success);
    }
    refreshDatasets();
  }, [page, pageSize, nameQuery, nameTaskQuery]);

  function searchName(text: string) {
    setNameQuery(text);
    setPage(0);
  }

  function searchNameTask(text: string) {
    setNameTaskQuery(text);
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
        <Helmet>
          <title>ExplainaBoard - Datasets</title>
        </Helmet>
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
          <Input.Search
            placeholder="Search by task name"
            value={nameTaskQuery}
            onChange={(e) => searchNameTask(e.target.value)}
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
    dataIndex: "languages",
    title: "Languages",
    render: (value) => (
      <span>
        {value.map((language: string, i: number) => (
          <Tag key={i}>{language}</Tag>
        ))}
      </span>
    ),
  },
  {
    dataIndex: "",
    title: "Leaderboard",
    render: (_, record) => {
      // every dataset leaderboard has an "all" split, which means allowing all possible splits
      let splits: Array<string | undefined> = ["all"];
      if (record.split !== undefined) {
        splits = splits.concat(Object.keys(record.split));
      }
      return splits.map((split) => {
        return (
          <div key={split}>
            <Link
              to={generateLeaderboardURL(
                record.dataset_name,
                record.sub_dataset,
                split
              )}
              component={Typography.Link}
            >
              {split}
            </Link>
          </div>
        );
      });
    },
  },
  {
    dataIndex: "links",
    title: "Links",
    render: (_, record) => (
      <>
        <Typography.Link
          href={generateDataLabURL(record.dataset_name)}
          target="_blank"
        >
          DataLab
        </Typography.Link>
      </>
    ),
  },
  {
    title: "Action",
    key: "action",
    render: (_, record) => (
      <Space size="middle">
        <ModalForImportTip
          sub_dataset={
            record.sub_dataset === undefined ? "" : record.sub_dataset
          }
          dataset_name={record.dataset_name}
        />
      </Space>
    ),
  },
];
