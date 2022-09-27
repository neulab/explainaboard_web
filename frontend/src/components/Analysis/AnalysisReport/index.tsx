import React, { useState } from "react";
import {
  ActiveSystemExamples,
  ResultFineGrainedParsed,
  BucketIntervals,
} from "../types";
import { SystemModel } from "../../../models";
import { SystemAnalysesReturn } from "../../../clients/openapi/api";
import { OverallMetricsBarChart } from "./OverallMetricsBarChart";
import { SignificanceTestList } from "./SignificanceTestList";
import { FineGrainedAnalysis } from "./FineGrainedAnalysis";
import { ExampleTable } from "./ExampleTable";

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
  const { metricToSystemAnalysesParsed } = props;
  const metricNames = Object.keys(metricToSystemAnalysesParsed);
  const [activeMetric, setActiveMetric] = useState<string>(metricNames[0]);
  const [activeSystemExamples, setActiveSystemExamples] =
    useState<ActiveSystemExamples>();

  // page number of the analysis table, 0 indexed
  const [page, setPage] = useState(0);

  /** sets page of AnalysisTable to the first page */
  function resetPage() {
    setPage(0);
  }

  /** Create the example table if a bar is selected, empty element if not */
  const exampleTable = (
    <ExampleTable
      task={props.task}
      systems={props.systems}
      activeSystemExamples={activeSystemExamples}
      setActiveSystemExamples={setActiveSystemExamples}
      page={page}
      setPage={setPage}
    />
  );

  return (
    <div>
      <OverallMetricsBarChart
        systems={props.systems}
        metricNames={Object.keys(metricToSystemAnalysesParsed)}
        onBarClick={(metricName) => setActiveMetric(metricName)}
      />

      {props.significanceTestInfo && (
        <SignificanceTestList
          significanceTestInfo={props.significanceTestInfo}
        />
      )}

      <FineGrainedAnalysis
        systems={props.systems}
        featureNameToBucketInfo={props.featureNameToBucketInfo}
        updateFeatureNameToBucketInfo={props.updateFeatureNameToBucketInfo}
        metricToSystemAnalysesParsed={props.metricToSystemAnalysesParsed}
        exampleTable={exampleTable}
        setActiveSystemExamples={setActiveSystemExamples}
        resetPage={resetPage}
        activeMetric={activeMetric}
        onActiveMetricChange={(newMetricName) => {
          setActiveMetric(newMetricName);
          setActiveSystemExamples(undefined);
        }}
        metricNames={metricNames}
      />
    </div>
  );
}
