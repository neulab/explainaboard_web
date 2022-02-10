import React, { useEffect, useState } from "react";
import { Table, Typography } from "antd";
import { ColumnsType } from "antd/lib/table";
import { SystemOutput } from "../../clients/openapi";
import { backendClient } from "../../clients";
import { PageState } from "../../utils";

interface Props {
  systemID: string;
  task: string;
  outputIDs: string[];
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

  const columns: ColumnsType<SystemOutput> = [
    {
      dataIndex: "id",
      title: "ID",
      render: (value) => (
        <Typography.Paragraph copyable style={{ marginBottom: 0 }}>
          {value}
        </Typography.Paragraph>
      ),
    },
  ];
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
  const dataSource = systemOutputs.map(function (s) {
    return { ...s };
  });

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
