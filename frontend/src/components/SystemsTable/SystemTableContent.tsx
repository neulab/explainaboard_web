import React from "react";
import {
  Button,
  message,
  Popconfirm,
  Space,
  Table,
  Drawer,
  Typography,
  Tag,
  Tooltip,
} from "antd";
import { ColumnsType } from "antd/lib/table";
import { backendClient, parseBackendError } from "../../clients";
import { SystemModel } from "../../models";
import { DeleteOutlined } from "@ant-design/icons";
import { AnalysisReport, PrivateIcon, ErrorBoundary } from "..";
import { generateDataLabURL } from "../../utils";
const { Text, Link } = Typography;

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
  activeSystemIDs: string[];
  setActiveSystemIDs: React.Dispatch<React.SetStateAction<string[]>>;
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
  activeSystemIDs,
  setActiveSystemIDs,
}: Props) {
  const activeSystems = systems.filter((sys) =>
    activeSystemIDs.includes(sys.system_id)
  );
  const analyses = activeSystems.map((sys) => sys["analysis"]);

  const metricColumns: ColumnsType<SystemModel> = metricNames.map((metric) => ({
    dataIndex: metric,
    render: (_, record) => record.analysis.getMetirc(metric)?.value,
    title: metric,
    width: 100,
    ellipsis: true,
    align: "center",
  }));

  function showSystemAnalysis(systemID: string) {
    setActiveSystemIDs([systemID]);
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
    setActiveSystemIDs([]);
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
      fixed: "left",
      title: "Name",
      render: (_, record) => (
        <div>
          <Text strong>{record.model_name}</Text>
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
          <Tooltip title="view dataset in DataLab">
            <Typography.Link
              href={generateDataLabURL(record.dataset.dataset_id)}
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
      dataIndex: "language",
      width: 100,
      title: "Language",
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
      width: 110,
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            onClick={() => showSystemAnalysis(record.system_id)}
          >
            Analysis
          </Button>
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

  // rowSelection object indicates the need for row selection
  const rowSelection = {
    selectedRowKeys: selectedSystemIDs,
    onChange: (selectedRowKeys: React.Key[], selectedRows: SystemModel[]) => {
      setSelectedSystemIDs(selectedRowKeys as string[]);
    },
  };

  let drawerTitle;
  if (activeSystems.length === 1) {
    drawerTitle = `Single Analysis of ${activeSystems[0].model_name}`;
  } else if (activeSystems.length === 2) {
    const systemNames = activeSystems
      .map((sys) => sys.model_name)
      .join(" and ");
    drawerTitle = `Pairwise Analysis of ${systemNames}`;
  }

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
      <Drawer
        visible={activeSystemIDs.length !== 0}
        onClose={() => closeSystemAnalysis()}
        title={drawerTitle}
        width="90%"
        bodyStyle={{ minWidth: "800px" }}
      >
        {activeSystems.length !== 0 && (
          // The analysis report is expected to fail if a user selects systems with different datsets.
          // We use an error boundary component and provide a fall back UI if an error is caught.
          <ErrorBoundary
            fallbackUI={
              <Text>
                An error occured in the analysis. Double check if the selected
                systems use the same dataset. If you found a bug, kindly open an
                issue on{" "}
                <Link
                  href="https://github.com/neulab/explainaboard_web"
                  target="_blank"
                >
                  our GitHub repo
                </Link>
                . Thanks!
              </Text>
            }
          >
            <AnalysisReport
              systemIDs={activeSystemIDs}
              systemInfos={activeSystems.map((sys) => {
                return {
                  modelName: sys.model_name,
                  metricNames: sys.metric_names,
                };
              })}
              task={activeSystems[0]?.task}
              analyses={analyses}
            />
          </ErrorBoundary>
        )}
      </Drawer>
    </div>
  );
}
