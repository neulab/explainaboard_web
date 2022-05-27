import React, { useEffect, useState } from "react";
import "./index.css";
import { backendClient } from "../../clients";
import { Benchmark } from "../../clients/openapi";
import { Tabs } from "antd";
import { ColumnsType } from "antd/es/table";
import { TableView } from "./TableView";

interface Props {
  /**initial value for task filter */
  benchmarkID: string;
}

/** A table that lists all systems */
export function BenchmarkTable({ benchmarkID }: Props) {
  const { TabPane } = Tabs;
  const [benchmark, setbenchmark] = useState<Benchmark>();

  useEffect(() => {
    async function fetchBenchmark() {
      setbenchmark(await backendClient.benchmarkBenchmarkIdGet(benchmarkID));
    }
    fetchBenchmark();
  }, [benchmarkID]);

  interface BenchmarkRecord {
    system_name: string;
    overall_result: number;
    task_name: string;
  }

  const columns_overall: ColumnsType<BenchmarkRecord> = [
    {
      dataIndex: "idx",
      render: (text, record, index) => index + 1,
      width: 50,
      fixed: "left",
      align: "center",
    },
    {
      title: "System Name",
      dataIndex: "system_name",
      key: "system_name",
    },
    {
      title: "Overall Result",
      dataIndex: "overall_result",
      key: "overall_result",
    },
  ];

  const columns_task: ColumnsType<BenchmarkRecord> = [
    {
      dataIndex: "idx",
      render: (text, record, index) => index + 1,
      width: 50,
      fixed: "left",
      align: "center",
    },
    {
      title: "System Name",
      dataIndex: "system_name",
      key: "system_name",
    },
    {
      title: "Overall Result",
      dataIndex: "overall_result",
      key: "overall_result",
    },
    {
      title: "Task",
      dataIndex: "task_name",
      key: "task_name",
    },
  ];

  const columns_dataset: ColumnsType<BenchmarkRecord> = [
    {
      dataIndex: "idx",
      render: (text, record, index) => index + 1,
      width: 50,
      fixed: "left",
      align: "center",
    },
    {
      title: "System Name",
      dataIndex: "system_name",
      key: "system_name",
    },
    {
      title: "Overall Result",
      dataIndex: "overall_result",
      key: "overall_result",
    },
    {
      title: "Dataset",
      dataIndex: "dataset_name",
      key: "dataset_name",
    },
  ];

  const columns_source_language: ColumnsType<BenchmarkRecord> = [
    {
      dataIndex: "idx",
      render: (text, record, index) => index + 1,
      width: 50,
      fixed: "left",
      align: "center",
    },
    {
      title: "System Name",
      dataIndex: "system_name",
      key: "system_name",
    },
    {
      title: "Overall Result",
      dataIndex: "overall_result",
      key: "overall_result",
    },
    {
      title: "Source Language",
      dataIndex: "source_language",
      key: "source_language",
    },
  ];

  const columns_map: { [index: string]: ColumnsType<BenchmarkRecord> } = {
    overall: columns_overall,
    task: columns_task,
    dataset: columns_dataset,
    source_language: columns_source_language,
  };

  if (benchmark) {
    // console.log(benchmark["task"]);
    return (
      <Tabs>
        {Object.keys(benchmark).map((key, sysIndex) => {
          return (
            <TabPane tab={key + " view"} key={key}>
              <TableView
                view={key}
                columns={columns_map[key]}
                dataSource={benchmark[key]}
              />
            </TabPane>
          );
        })}
      </Tabs>

      // <Table columns={columns} dataSource={benchmark["overall"]} />
    );
  } else {
    return <div></div>;
  }
}
