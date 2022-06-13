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
  Layout,
  Descriptions,
} from "antd";
import { ColumnsType } from "antd/es/table";
import { TableView } from "./TableView";
import { PageState } from "../../utils";
import { generateLeaderboardURL } from "../../utils";
import { useHistory, Link } from "react-router-dom";
import { CheckSquareTwoTone } from "@ant-design/icons";

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
    let supportedTasks = Array<string>();

    const { Panel } = Collapse;
    const onChange = (key: string | string[]) => {
      console.log(key);
    };

    if (benchmark.config.datasets !== undefined) {
      for (const dataset of benchmark.config.datasets) {
        // console.log(dataset);
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

      // const tasks = new Set(benchmark.config.datasets.map((dataset) => dataset["task"]))
      const tasks = benchmark.config.datasets.map((dataset) => dataset["task"]);
      if (tasks[0] === undefined) {
        supportedTasks = ["unknown"];
      } else {
        supportedTasks = Array.from(new Set(tasks));
      }
    }

    // initialize contact
    let contact = "unknown";
    if (benchmark.config.contact !== undefined) {
      contact = benchmark.config.contact;
    }

    // initialize contact
    let paper_title = "unknown";
    let paper_url = "unknown";
    let homepage = "unknown";

    if (benchmark.config.paper !== undefined) {
      paper_title = benchmark.config.paper["title"];
    }
    if (benchmark.config.paper !== undefined) {
      paper_url = benchmark.config.paper["url"];
    }
    if (benchmark.config.homepage !== undefined) {
      homepage = benchmark.config.homepage;
    }
    let tabs = <div>No benchmark data.</div>;
    if (benchmark.views !== undefined) {
      tabs = (
        <Tabs>
          {benchmark.views.map((my_view) => {
            return tableToPage(my_view);
          })}
        </Tabs>
      );
    }

    return (
      <div>
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
                  <CheckSquareTwoTone /> Homepage
                </b>
              }
            >
              <a target="_blank" rel="noreferrer" href={homepage}>
                {"Website"}
              </a>
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <b style={{ fontSize: "14px" }}>
                  {" "}
                  <CheckSquareTwoTone /> Contact
                </b>
              }
            >
              {contact}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <b style={{ fontSize: "14px" }}>
                  <CheckSquareTwoTone /> Reference
                </b>
              }
            >
              <a target="_blank" rel="noreferrer" href={paper_url}>
                {paper_title}
              </a>
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <b style={{ fontSize: "14px" }}>
                  <CheckSquareTwoTone /> Covered Datasets
                </b>
              }
            >
              {supportedDatasets.length}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <b style={{ fontSize: "14px" }}>
                  <CheckSquareTwoTone /> Covered Tasks
                </b>
              }
            >
              {supportedTasks.length}
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
                        <Avatar src="https://explainaboard.s3.amazonaws.com/logo/dataset.png" />
                      }
                      title={<h4>{item}</h4>}
                      description=""
                    />
                  </List.Item>
                )}
              />
            </Panel>

            <Panel header="Constituent Tasks" key="2">
              <List
                itemLayout="horizontal"
                dataSource={supportedTasks}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar src="https://explainaboard.s3.amazonaws.com/logo/task.png" />
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

        <div style={{ padding: "10px 10px" }}>{tabs}</div>
      </div>
    );
  } else {
    return (
      <div>
        <PageHeader
          title={<b style={{ fontSize: "30px" }}>{benchmarkID} Benchmark</b>}
          onBack={history.goBack}
        ></PageHeader>
        <Spin spinning={pageState === PageState.loading} tip="Loading..." />
      </div>
    );
  }
}
