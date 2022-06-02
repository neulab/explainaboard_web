import React, { useEffect, useState } from "react";
import "./index.css";
import { backendClient } from "../../clients";
import { Benchmark, BenchmarkTableData } from "../../clients/openapi";
import { Tabs, Spin } from "antd";
import { ColumnsType } from "antd/es/table";
import { TableView } from "./TableView";
import { PageState } from "../../utils";
import { generateLeaderboardURL } from "../../utils";

interface Props {
  /**initial value for task filter */
  benchmarkID: string;
}

function tableToPage(my_view: BenchmarkTableData) {
  const cols = ["system_name"].concat(my_view.column_names);
  const { TabPane } = Tabs;

  const data_cols: ColumnsType<Array<string | number>> = cols.map(
    (col_name, col_idx) => {
      return { title: col_name, dataIndex: col_idx, key: col_idx };
    }
  );

  // Add the system names and convert all numbers to strings
  const sys_data = my_view.system_names.map((sys_name, i) =>
    [sys_name].concat(my_view.scores[i].map((score) => score.toFixed(4)))
  );
  const view_name = my_view.name;
  return (
    <TabPane tab={view_name + " view"} key={view_name}>
      <TableView view={view_name} columns={data_cols} dataSource={sys_data} />
    </TabPane>
  );
}

/** A table that lists all systems */
export function BenchmarkTable({ benchmarkID }: Props) {
  const [benchmark, setBenchmark] = useState<Benchmark>();
  const [pageState, setPageState] = useState(PageState.loading);

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
        <p> {supportedDatasets}</p>
        <Tabs>
          {benchmark.views.map((my_view) => {
            return tableToPage(my_view);
          })}
        </Tabs>
      </div>
    );
  } else {
    return <Spin spinning={pageState === PageState.loading} tip="Loading..." />;
  }
}
