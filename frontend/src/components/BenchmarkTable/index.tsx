import React, { useEffect, useState } from "react";
import "./index.css";
import { backendClient } from "../../clients";
import { Benchmark, BenchmarkTableData } from "../../clients/openapi";
import {
  Tabs,
  Spin,
  PageHeader,
  List,
  Collapse,
  Avatar,
  Space,
  Button,
  Layout,
  Alert,
  Descriptions,
} from "antd";
import { ColumnsType } from "antd/es/table";
import { TableView } from "./TableView";
import { PageState } from "../../utils";
import { generateLeaderboardURL } from "../../utils";
import { useHistory, Link } from "react-router-dom";
import { SearchOutlined, CheckSquareTwoTone } from "@ant-design/icons";

interface Props {
  /**initial value for task filter */
  benchmarkID: string;
}

function tableToPage(my_view: BenchmarkTableData) {
  const cols = ["Rank", "system_name"].concat(my_view.column_names);
  const { TabPane } = Tabs;

  const data_cols: ColumnsType<Array<string | number>> = cols.map(
    (col_name, col_idx) => {
      return {
        title: col_name,
        dataIndex: col_idx,
        key: col_idx,
        render: (text, record) =>
          col_name === "system_name" ? (
            <h4>
              <Link to={`/systems?system=${text.split(" ").join()}`}>
                {text}
              </Link>{" "}
            </h4>
          ) : (
            <h4>{text}</h4>
          ),
      };
    }
  );

  // Add the system names and convert all numbers to strings
  const sys_data = my_view.system_names.map((sys_name, i) =>
    [i + 1, sys_name].concat(my_view.scores[i].map((score) => score.toFixed(4)))
  );
  const view_name = my_view.name;
  return (
    <TabPane tab={view_name} key={view_name}>
      <TableView view={view_name} columns={data_cols} dataSource={sys_data} />
    </TabPane>
  );
}

/** A table that lists all systems */
export function BenchmarkTable({ benchmarkID }: Props) {
  const [benchmark, setBenchmark] = useState<Benchmark>();
  const [pageState, setPageState] = useState(PageState.loading);
  const history = useHistory();

  useEffect(() => {
    async function fetchBenchmark() {
      setPageState(PageState.loading);
      setBenchmark(await backendClient.benchmarkBenchmarkIdGet(benchmarkID));
      setPageState(PageState.success);
    }
    fetchBenchmark();
  }, [benchmarkID]);

  if (benchmark !== undefined) {
    const supportedDatasets = Array<JSX.Element>();
    // supportedDatasets.push(<b>Constituent Dataset Leaderboards: </b>);
    for (const dataset of benchmark.config.datasets) {
      console.log(dataset);
      let datasetString = `${dataset["dataset_name"]} `;
      if ("sub_dataset" in dataset) {
        datasetString = `${datasetString} (${dataset["sub_dataset"]}) `;
      }
      const url = generateLeaderboardURL(
        dataset["dataset_name"],
        dataset["sub_dataset"],
        dataset["split"]
      );
      supportedDatasets.push(<a href={url}>{datasetString}</a>);
    }

    const { Header, Footer, Sider, Content } = Layout;
    const { Panel } = Collapse;
    const onChange = (key: string | string[]) => {
      console.log(key);
    };
    // const tasks = new Set(benchmark.config.datasets.map((dataset) => dataset["task"]))
    let tasks = benchmark.config.datasets.map((dataset) => dataset["task"]);
    if (tasks[0] === undefined) tasks = ["unknow"];
    const tasks_unique = new Set(tasks);

    return (
      <div>
        {/* <PageHeader
          title={benchmark.config.name + " Benchmark"}
          subTitle={benchmark.config.description}
          onBack={history.goBack}
        /> */}

        <div style={{ padding: "10px 10px" }}>
          <Descriptions
            title={<b style={{ fontSize: "30px" }}>{benchmark.config.name}</b>}
          >
            <Descriptions.Item
              label={
                <b style={{ fontSize: "14px" }}>
                  {" "}
                  <CheckSquareTwoTone /> Description
                </b>
              }
              span={2}
            >
              {benchmark.config.description}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <b style={{ fontSize: "14px" }}>
                  {" "}
                  <CheckSquareTwoTone /> Contact
                </b>
              }
            >
              {tasks_unique.size}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <b style={{ fontSize: "14px" }}>
                  <CheckSquareTwoTone /> Reference
                </b>
              }
            >
              {"This is the paper"}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <b style={{ fontSize: "14px" }}>
                  <CheckSquareTwoTone /> Covered Datasets
                </b>
              }
            >
              {benchmark.config.datasets.length}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <b style={{ fontSize: "14px" }}>
                  <CheckSquareTwoTone /> Covered Tasks
                </b>
              }
            >
              {tasks_unique.size}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <b style={{ fontSize: "14px" }}>
                  <CheckSquareTwoTone /> Upload Instruction
                </b>
              }
              span={4}
            >
              Follow this{" "}
              <a
                target="_blank"
                rel="noreferrer"
                href={"https://github.com/neulab/explainaboard_client"}
              >
                {" "}
                &nbsp; tutorial &nbsp;{" "}
              </a>
              for detailed submission instructions
            </Descriptions.Item>
          </Descriptions>
        </div>

        <Layout>
          <Collapse onChange={onChange}>
            <Panel header="Constituent Dataset Leaderboards" key="1">
              <List
                itemLayout="horizontal"
                dataSource={supportedDatasets}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar src="https://explainaboard.s3.amazonaws.com/logo/logo.png" />
                      }
                      title={<a href="https://ant.design">{item}</a>}
                      description=""
                    />
                  </List.Item>
                )}
              />
            </Panel>

            <Panel header="Constituent Tasks" key="2">
              <List
                itemLayout="horizontal"
                dataSource={Array.from(tasks_unique)}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar src="https://explainaboard.s3.amazonaws.com/logo/logo.png" />
                      }
                      title={<h4>{item}</h4>}
                      description=""
                    />
                  </List.Item>
                )}
              />
            </Panel>
          </Collapse>
        </Layout>

        {/* <Alert
              message="Tutorial for Submission"
              description="You can submit your systems to the benchmark easily"
              type="info"
              showIcon
              action={
                <Space direction="vertical">
                  <Button size="small" danger type="ghost" href={"https://github.com/ExpressAI/ExplainaBoard"}>
                    Detail
                  </Button>
                </Space>
              }
              closable
            /> */}

        <div style={{ padding: "10px 10px" }}>
          <Tabs>
            {benchmark.views.map((my_view) => {
              return tableToPage(my_view);
            })}
          </Tabs>
        </div>
      </div>
    );
  } else {
    return (
      <div>
        <PageHeader
          title={benchmarkID + " Benchmark"}
          onBack={history.goBack}
        />
        <Spin spinning={pageState === PageState.loading} tip="Loading..." />
      </div>
    );
  }
}
