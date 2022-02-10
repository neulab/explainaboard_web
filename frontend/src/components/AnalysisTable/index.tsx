import React, { useEffect, useState } from "react";
import { Table, Typography } from "antd";
import { ColumnsType } from "antd/lib/table";
import { SystemOutput } from "../../clients/openapi";
import { backendClient } from "../../clients";
import { PageState } from "../../utils";

interface Props {
  systemID: string;
  task: string;
  // The latter type is for NER
  outputIDs: string[] | { [key: string]: string }[];
  featureKeys: string[];
  descriptions: string[];
}

export function AnalysisTable({
  systemID,
  task,
  outputIDs,
  featureKeys,
  descriptions,
}: Props) {
  const [pageState, setPageState] = useState(PageState.loading);
  const [page, setPage] = useState(0);
  const [systemOutputs, setSystemOutputs] = useState<SystemOutput[]>([]);

  const pageSize = 10;
  const total = outputIDs.length;
  const offset = page * pageSize;
  const end = Math.min(offset + pageSize, outputIDs.length);
  const outputIDString = outputIDs.slice(offset, end).join(",");

  useEffect(() => {
    async function refreshSystemOutputs() {
      setPageState(PageState.loading);
      const result = await backendClient.systemsSystemIdOutputsGet(
        systemID,
        outputIDString
      );
      setSystemOutputs(result.system_outputs);
      setPageState(PageState.success);
    }
    refreshSystemOutputs();
  }, [systemID, outputIDString, page, pageSize]);

  const columns: ColumnsType<SystemOutput> = [];
  let dataSource;

  // NER
  if (task === "named-entity-recognition") {
    for (const subFeatureKey of Object.keys(outputIDs[0])) {
      columns.push({
        dataIndex: subFeatureKey,
        title: subFeatureKey,
        ellipsis: true,
      });
    }
    // TODO API request to retrieve text
    dataSource = outputIDs.map(function (o) {
      const output = o as { [key: string]: string };
      return { ...output };
    });

    // other tasks
  } else {
    // ID
    columns.push({
      dataIndex: "id",
      title: "ID",
      render: (value) => (
        <Typography.Paragraph copyable style={{ marginBottom: 0 }}>
          {value}
        </Typography.Paragraph>
      ),
    });
    // other fields
    for (let i = 0; i < featureKeys.length; i++) {
      if (featureKeys[i] === "id") {
        continue;
      }
      columns.push({
        dataIndex: featureKeys[i],
        title: i < descriptions.length ? descriptions[i] : featureKeys[i],
        ellipsis: true,
      });
    }
    // clone the system output for modification
    dataSource = systemOutputs.map(function (s) {
      return { ...s };
    });
  }

  for (let i = 0; i < dataSource.length; i++) {
    if (task === "extractive-qa") {
      const trueAnswer = systemOutputs[i]["true_answers"];
      const text = trueAnswer["text"][0];
      const answerStart = trueAnswer["answer_start"][0];
      dataSource[i][
        "true_answers"
      ] = `- Text: ${text}\n- Start position:${answerStart}`;
    }
  }

  return (
    <Table
      className="table"
      columns={columns}
      dataSource={dataSource}
      loading={pageState === PageState.loading}
      pagination={{
        total,
        showTotal: (total, range) =>
          `${range[0]}-${range[1]} (total: ${total})`,
        pageSize,
        // conversion between 0-based and 1-based index
        current: page + 1,
        onChange: (newPage, newPageSize) => {
          setPage(newPage - 1);
        },
      }}
      scroll={{ y: 400 }}
    />
  );
}
