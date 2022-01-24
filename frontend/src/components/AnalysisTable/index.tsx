import React, { useEffect, useState } from "react";
import { Table, Typography } from "antd";
import { ColumnsType } from "antd/lib/table";
import { SystemOutput } from "../../clients/openapi";
import { backendClient } from "../../clients";
import { PageState } from "../../utils";

interface Props {
  systemID: string;
  outputIDs: string[];
}

export function AnalysisTable({ systemID, outputIDs }: Props) {
  const [pageState, setPageState] = useState(PageState.loading);
  const [systemOutputs, setSystemOutputs] = useState<SystemOutput[]>([]);
  const [total, setTotal] = useState(0);

  const outputIDString = outputIDs.join(",");
  useEffect(() => {
    async function refreshSystemOutputs() {
      setPageState(PageState.loading);
      const { system_outputs, total } =
        await backendClient.systemsSystemIdOutputsGet(systemID, outputIDString);
      setSystemOutputs(system_outputs);
      setTotal(total);
      setPageState(PageState.success);
    }
    refreshSystemOutputs();
  }, [systemID, outputIDString]);

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
    {
      dataIndex: "true_label",
      title: "True Label",
    },
    {
      dataIndex: "predicted_label",
      title: "Predicted Label",
    },
    {
      dataIndex: "sentence_length",
      title: "Sentence Length",
    },
    {
      dataIndex: "token_number",
      title: "Number of Tokens",
    },
    {
      dataIndex: "text",
      title: "Text",
    },
  ];
  return (
    <Table
      className="table"
      columns={columns}
      dataSource={systemOutputs}
      loading={pageState === PageState.loading}
    />
  );
}
