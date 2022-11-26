import React, { useEffect, useState } from "react";
import { Tabs, Tooltip, Typography } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { backendClient } from "../../../../clients";
import { AnalysisPanel } from "../AnalysisPanel";
import { MetricPane } from "./MetricPane";
import { SystemModel } from "../../../../models";
import { BucketIntervals, ResultFineGrainedParsed } from "../../types";

interface Props {
  task: string;
  activeMetric: string;
  onActiveMetricChange: (newMetricName: string) => void;
  metricNames: string[];
  systems: SystemModel[];
  featureNameToBucketInfo: { [feature: string]: BucketIntervals };
  updateFeatureNameToBucketInfo: (
    featureName: string,
    bucketInfo: BucketIntervals
  ) => void;
  metricToSystemAnalysesParsed: {
    [metric: string]: { [feature: string]: ResultFineGrainedParsed[] };
  };
  addChartFile: (imgName: string, base64File: string) => void;
}

export function FineGrainedAnalysis({
  task,
  activeMetric,
  onActiveMetricChange,
  metricNames,
  systems,
  featureNameToBucketInfo,
  updateFeatureNameToBucketInfo,
  metricToSystemAnalysesParsed,
  addChartFile,
}: Props) {
  const [metricDescriptions, setMetricDescriptions] = useState<{
    [key: string]: string;
  }>({});

  useEffect(() => {
    async function fetchMetricDescriptions() {
      setMetricDescriptions(await backendClient.metricDescriptionsGet());
    }
    fetchMetricDescriptions();
  }, []);

  return (
    <AnalysisPanel title="Fine-grained Performance">
      <Typography.Paragraph>
        Click a bar to see detailed cases of the system output at the bottom of
        the page.
      </Typography.Paragraph>
      <Tabs activeKey={activeMetric} onChange={onActiveMetricChange}>
        {metricNames.map((metric) => (
          <Tabs.TabPane
            key={metric}
            tab={
              <span>
                {metric}&nbsp;
                <Tooltip title={metricDescriptions[metric]}>
                  <QuestionCircleOutlined style={{ color: "gray" }} />
                </Tooltip>
              </span>
            }
          >
            <MetricPane
              task={task}
              systems={systems}
              featureNameToBucketInfo={featureNameToBucketInfo}
              updateFeatureNameToBucketInfo={updateFeatureNameToBucketInfo}
              metricToSystemAnalysesParsed={metricToSystemAnalysesParsed}
              metric={metric}
              addChartFile={addChartFile}
            />
          </Tabs.TabPane>
        ))}
      </Tabs>
    </AnalysisPanel>
  );
}
