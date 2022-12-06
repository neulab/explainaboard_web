import React, { useEffect, useMemo, useState } from "react";
import { ResultFineGrainedParsed, BucketIntervals } from "../types";
import { SystemModel } from "../../../models";
import { SystemAnalysesReturn } from "../../../clients/openapi/api";
import { OverallMetricsBarChart } from "./OverallMetricsBarChart";
import { SignificanceTestList } from "./SignificanceTestList";
import { SystemInsights } from "./SystemInsights";
import { FineGrainedAnalysis } from "./FineGrainedAnalysis";

interface Props {
  task: string;
  systems: SystemModel[];
  systemAnalyses: SystemAnalysesReturn["system_analyses"];
  significanceTestInfo: SystemAnalysesReturn["significance_test_info"];
  systemInsights: SystemAnalysesReturn["system_insights"];
  metricToSystemAnalysesParsed: {
    [metric: string]: { [feature: string]: ResultFineGrainedParsed[] };
  };
  featureNameToBucketInfo: { [feature: string]: BucketIntervals };
  updateFeatureNameToBucketInfo: (
    featureName: string,
    bucketInfo: BucketIntervals
  ) => void;
  addChartFile: (imgName: string, base64File: string) => void;
}

export function AnalysisReport(props: Props) {
  const {
    task,
    systems,
    systemAnalyses,
    metricToSystemAnalysesParsed,
    significanceTestInfo,
    systemInsights,
    updateFeatureNameToBucketInfo,
    featureNameToBucketInfo,
    addChartFile,
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
        systemAnalyses={systemAnalyses}
        metricNames={Object.keys(metricToSystemAnalysesParsed)}
        onBarClick={onActiveMetricChange}
        addChartFile={addChartFile}
      />

      {significanceTestInfo && (
        <SignificanceTestList significanceTestInfo={significanceTestInfo} />
      )}

      {systemInsights !== undefined && systemInsights.length > 0 && (
        <SystemInsights systemInsights={systemInsights} />
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
        addChartFile={addChartFile}
      />
    </div>
  );
}
