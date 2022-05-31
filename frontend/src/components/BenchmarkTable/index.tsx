import React, { useEffect, useState } from "react";
import "./index.css";
import { backendClient } from "../../clients";
import { Benchmark } from "../../clients/openapi";
import { Tabs } from "antd";
import { TableView } from "./TableView";

interface Props {
  /**initial value for task filter */
  benchmarkID: string;
}

/** A table that lists all systems */
export function BenchmarkTable({ benchmarkID }: Props) {
  const { TabPane } = Tabs;
  const [benchmark, setBenchmark] = useState<Benchmark>();

  useEffect(() => {
    async function fetchBenchmark() {
      setBenchmark(await backendClient.benchmarkBenchmarkIdGet(benchmarkID));
    }
    fetchBenchmark();
  }, [benchmarkID]);

  if (benchmark !== undefined) {
    return (
      <Tabs>
        {Object.keys(benchmark.views).map((view_name) => {
          const my_view = benchmark.views[view_name];
          const col_names = ["system_name"].concat(my_view.column_names);
          // Add the system names and convert all numbers to strings
          const sys_data = my_view.system_names.map((sys_name, i) =>
            [sys_name].concat(
              my_view.scores[i].map((score) => score.toFixed(4))
            )
          );
          return (
            <TabPane tab={view_name + " view"} key={view_name}>
              <TableView
                view={view_name}
                columns={col_names}
                dataSource={sys_data}
              />
            </TabPane>
          );
        })}
      </Tabs>
    );
  } else {
    return <div></div>;
  }
}
