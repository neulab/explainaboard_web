import React from "react";
import { Avatar, List } from "antd";
import { SignificanceTestInfo } from "../../../clients/openapi";
import { AnalysisPanel } from "./AnalysisPanel";

interface Props {
  significanceTestInfo: SignificanceTestInfo[];
}
export function SignificanceTestList({ significanceTestInfo }: Props) {
  const disabled = significanceTestInfo.length === 0;
  return (
    <AnalysisPanel
      title="Significance Test"
      disabled={disabled}
      titleTooltip={
        disabled
          ? "Significance test is only available for pairwise analysis (selecting two systems)."
          : undefined
      }
    >
      <List
        itemLayout="horizontal"
        dataSource={significanceTestInfo}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                <Avatar src="https://explainaboard.s3.amazonaws.com/logo/task.png" />
              }
              title={
                <a href="https://github.com/neulab/ExplainaBoard/tree/main/explainaboard/metrics">
                  {item.metric_name} ({item.method_description})
                </a>
              }
              description={item.result_description}
            />
          </List.Item>
        )}
      />
    </AnalysisPanel>
  );
}
