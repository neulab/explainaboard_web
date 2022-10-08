import React, { useEffect, useMemo, useState } from "react";
import { ResultFineGrainedParsed, BucketIntervals } from "../types";
import { SystemModel } from "../../../models";
import { SystemAnalysesReturn } from "../../../clients/openapi/api";
import { OverallMetricsBarChart } from "./OverallMetricsBarChart";
import { SignificanceTestList } from "./SignificanceTestList";
import { FineGrainedAnalysis } from "./FineGrainedAnalysis";

interface Props {
  task: string;
  systems: SystemModel[];
  systemAnalyses: SystemAnalysesReturn["system_analyses"];
  significanceTestInfo: SystemAnalysesReturn["significance_test_info"];
  metricToSystemAnalysesParsed: {
    [metric: string]: { [feature: string]: ResultFineGrainedParsed[] };
  };
  featureNameToBucketInfo: { [feature: string]: BucketIntervals };
  updateFeatureNameToBucketInfo: (
    featureName: string,
    bucketInfo: BucketIntervals
  ) => void;
}

export function AnalysisReport(props: Props) {
  const {
    task,
    systems,
    metricToSystemAnalysesParsed,
    significanceTestInfo,
    updateFeatureNameToBucketInfo,
    featureNameToBucketInfo,
  } = props;
  const metricNames = useMemo(
    () => Object.keys(metricToSystemAnalysesParsed),
    [metricToSystemAnalysesParsed]
  );
  const [activeMetric, setActiveMetric] = useState<string>(metricNames[0]);

  useEffect(() => {
    setActiveMetric(metricNames[0]);
  }, [metricNames]);

  function onActiveMetricChange(newMetricName: string) {
    setActiveMetric(newMetricName);
  }

  return (
    <div>
      <OverallMetricsBarChart
        systems={systems}
        metricNames={Object.keys(metricToSystemAnalysesParsed)}
        onBarClick={onActiveMetricChange}
      />

      {significanceTestInfo && (
        <SignificanceTestList significanceTestInfo={significanceTestInfo} />
      )}

      <FineGrainedAnalysis
        task={task}
        systems={systems}
        featureNameToBucketInfo={featureNameToBucketInfo}
        updateFeatureNameToBucketInfo={updateFeatureNameToBucketInfo}
        metricToSystemAnalysesParsed={metricToSystemAnalysesParsed}
        activeMetric={activeMetric}
        onActiveMetricChange={onActiveMetricChange}
        metricNames={metricNames}
      />
    </div>
  );
}
