import { Row } from "antd";
import React from "react";
import { SystemModel } from "../../../../models";
import {
  ActiveSystemExamples,
  BucketIntervals,
  ResultFineGrainedParsed,
} from "../../types";
import { FineGrainedBarChart } from "./FineGrainedBarChart";

interface Props {
  systems: SystemModel[];
  featureNameToBucketInfo: { [feature: string]: BucketIntervals };
  updateFeatureNameToBucketInfo: (
    featureName: string,
    bucketInfo: BucketIntervals
  ) => void;
  metricToSystemAnalysesParsed: {
    [metric: string]: { [feature: string]: ResultFineGrainedParsed[] };
  };
  metric: string;
  colSpan: number;
  exampleTable: JSX.Element;
  setActiveSystemExamples: React.Dispatch<
    React.SetStateAction<ActiveSystemExamples | undefined>
  >;
  resetPage: () => void;
}
export function MetricPane(props: Props) {
  const {
    metricToSystemAnalysesParsed,
    metric,
    colSpan,
    setActiveSystemExamples,
    resetPage,
    exampleTable,
  } = props;
  const systemAnalysesParsed = metricToSystemAnalysesParsed[metric];

  /*Get the parsed result from the first system for mapping.
    FeatureNames and descriptions are invariant information
    */
  return (
    <div>
      <Row>
        {
          // Map the resultsFineGrainedParsed of the every element in systemAnalysesParsed
          // into columns. One column contains a single BarChart.
          Object.keys(systemAnalysesParsed).map((feature) => (
            <FineGrainedBarChart
              systems={props.systems}
              featureNameToBucketInfo={props.featureNameToBucketInfo}
              updateFeatureNameToBucketInfo={
                props.updateFeatureNameToBucketInfo
              }
              metric={metric}
              results={systemAnalysesParsed[feature]}
              colSpan={colSpan}
              setActiveSystemExamples={setActiveSystemExamples}
              resetPage={resetPage}
              key={feature}
            />
          ))
        }
      </Row>
      {exampleTable}
    </div>
  );
}
