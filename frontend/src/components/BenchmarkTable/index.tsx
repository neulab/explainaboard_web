import React, { useEffect, useState } from "react";
import "./index.css";
import { backendClient } from "../../clients";
import { Benchmark, BenchmarkTableData } from "../../clients/openapi";
import { Tabs, Spin, PageHeader } from "antd";
import { ColumnsType } from "antd/es/table";
import { TableView } from "./TableView";
import { PageState } from "../../utils";
import { generateLeaderboardURL } from "../../utils";
import { useHistory, Link } from "react-router-dom";

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
    supportedDatasets.push(<b>Constituent Dataset Leaderboards: </b>);
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
    return (
      <div>
        <PageHeader
          title={benchmark.config.name + " Benchmark"}
          subTitle={benchmark.config.description}
          onBack={history.goBack}
        />
        <div style={{ padding: "10px 10px" }}>
          <p> {supportedDatasets}</p>
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
