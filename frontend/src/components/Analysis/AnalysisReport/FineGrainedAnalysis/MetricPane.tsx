import React, { useState } from "react";
import { Row } from "antd";
import { SystemModel } from "../../../../models";
import {
  ActiveSystemExamples,
  BucketIntervals,
  ResultFineGrainedParsed,
} from "../../types";
import { ExampleTable } from "../ExampleTable";
import { FineGrainedBarChart } from "./FineGrainedBarChart";

interface Props {
  task: string;
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
}
export function MetricPane(props: Props) {
  const { task, systems, metricToSystemAnalysesParsed, metric } = props;
  const systemAnalysesParsed = metricToSystemAnalysesParsed[metric];

  const [activeSystemExamples, setActiveSystemExamples] =
    useState<ActiveSystemExamples>();
  // page number of the analysis table, 0 indexed
  const [page, setPage] = useState(0);

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
              setActiveSystemExamples={setActiveSystemExamples}
              resetPage={() => setPage(0)}
              key={feature}
            />
          ))
        }
      </Row>
      <ExampleTable
        task={task}
        systems={systems}
        activeSystemExamples={activeSystemExamples}
        setActiveSystemExamples={setActiveSystemExamples}
        page={page}
        setPage={setPage}
      />
    </div>
  );
}
