import React, { useEffect, useState } from "react";
import { Table, Typography } from "antd";
import { ColumnsType } from "antd/lib/table";
import { SystemOutput } from "../../clients/openapi";
import { backendClient } from "../../clients";
import { PageState } from "../../utils";

interface Props {
  systemID: string;
  outputIDs: string[];
  featureKeys: string[];
  descriptions: string[];
}

export function AnalysisTable({
  systemID,
  outputIDs,
  featureKeys,
  descriptions,
}: Props) {
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
  ];
  for (let i = 0; i < featureKeys.length; i++) {
    columns.push({
      dataIndex: featureKeys[i],
      title: i < descriptions.length ? descriptions[i] : featureKeys[i],
      ellipsis: true,
    });
  }
  // TODO: pagination
  return (
    <Table
      className="table"
      columns={columns}
      dataSource={systemOutputs}
      loading={pageState === PageState.loading}
    />
  );
}
