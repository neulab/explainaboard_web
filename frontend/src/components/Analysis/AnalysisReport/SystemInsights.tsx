import React from "react";
import { List } from "antd";
import { SystemAnalysesReturn } from "../../../clients/openapi";
import { AnalysisPanel } from "./AnalysisPanel";

interface Props {
  systemInsights: SystemAnalysesReturn["system_insights"];
}
export function SystemInsights({ systemInsights }: Props) {
  return (
    <AnalysisPanel title="System Insights">
      <List
        itemLayout="horizontal"
        dataSource={systemInsights}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta title={Object.values(item)[0]} />
          </List.Item>
        )}
      />
    </AnalysisPanel>
  );
}
