import React from "react";
import { Tabs, Typography } from "antd";
import { AnalysisPanel } from "../AnalysisPanel";
import { MetricPane } from "./MetricPane";
import { SystemModel } from "../../../../models";
import {
  ActiveSystemExamples,
  BucketIntervals,
  ResultFineGrainedParsed,
} from "../../types";

interface Props {
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
  colSpan: number;
  exampleTable: JSX.Element;
  setActiveSystemExamples: React.Dispatch<
    React.SetStateAction<ActiveSystemExamples | undefined>
  >;
  resetPage: () => void;
}

export function FineGrainedAnalysis({
  activeMetric,
  onActiveMetricChange,
  metricNames,
  systems,
  featureNameToBucketInfo,
  updateFeatureNameToBucketInfo,
  metricToSystemAnalysesParsed,
  colSpan,
  exampleTable,
  setActiveSystemExamples,
  resetPage,
}: Props) {
  return (
    <AnalysisPanel title="Fine-grained Performance">
      <Typography.Paragraph>
        Click a bar to see detailed cases of the system output at the bottom of
        the page.
      </Typography.Paragraph>
      <Tabs activeKey={activeMetric} onChange={onActiveMetricChange}>
        {metricNames.map((metric) => (
          <Tabs.TabPane tab={metric} key={metric}>
            <MetricPane
              systems={systems}
              featureNameToBucketInfo={featureNameToBucketInfo}
              updateFeatureNameToBucketInfo={updateFeatureNameToBucketInfo}
              metricToSystemAnalysesParsed={metricToSystemAnalysesParsed}
              metric={metric}
              colSpan={colSpan}
              exampleTable={exampleTable}
              setActiveSystemExamples={setActiveSystemExamples}
              resetPage={resetPage}
            />
          </Tabs.TabPane>
        ))}
      </Tabs>
    </AnalysisPanel>
  );
}
