import { Col } from "antd";
import React from "react";
import { backendClient } from "../../../../clients";
import { SystemModel } from "../../../../models";
import { BarChart } from "../../BarChart";
import { BucketSlider } from "../../BucketSlider";
import {
  ActiveSystemExamples,
  BucketIntervals,
  ResultFineGrainedParsed,
} from "../../types";
import { unwrapConfidence } from "../../utils";

interface Props {
  systems: SystemModel[];
  featureNameToBucketInfo: { [feature: string]: BucketIntervals };
  updateFeatureNameToBucketInfo: (
    featureName: string,
    bucketInfo: BucketIntervals
  ) => void;
  metric: string;
  results: ResultFineGrainedParsed[];
  colSpan: number;
  setActiveSystemExamples: React.Dispatch<
    React.SetStateAction<ActiveSystemExamples | undefined>
  >;
  resetPage: () => void;
}

export function FineGrainedBarChart(props: Props) {
  const {
    systems,
    featureNameToBucketInfo,
    updateFeatureNameToBucketInfo,
    results,
    colSpan,
    setActiveSystemExamples,
    resetPage,
    metric,
  } = props;
  // For invariant variables across all systems, we can simply take from the first result
  const systemNames = systems.map((system) => system.system_info.system_name);
  const resultFirst = results[0];
  const title = `${metric} by ${resultFirst.featureDescription}`;
  const bucketNames = resultFirst.bucketNames;
  const featureName = resultFirst.featureName;
  let bucketSlider = null;
  if (featureName in featureNameToBucketInfo) {
    const bucketInfo = featureNameToBucketInfo[featureName];
    const bucketRightBounds = bucketInfo.bounds;
    if (bucketRightBounds !== undefined) {
      const bucketMin = bucketInfo.min;
      const bucketMax = bucketInfo.max;
      const bucketStep = bucketMax - bucketMin <= 1.0 ? 0.01 : 1;
      bucketSlider = (
        <BucketSlider
          min={bucketMin}
          max={bucketMax}
          marks={{
            [bucketMin]: bucketMin.toFixed(2),
            [bucketMax]: bucketMax.toFixed(2),
          }}
          step={bucketStep}
          inputValues={bucketRightBounds}
          onChange={(bounds) => {
            updateFeatureNameToBucketInfo(featureName, {
              min: bucketMin,
              max: bucketMax,
              bounds: bounds,
              updated: true,
            });
          }}
        />
      );
    }
  }

  // System-dependent variables must be taken from all systems
  const resultsValues: number[][] = [];
  const resultsNumbersOfSamples: number[][] = [];
  const resultsConfidenceScores: Array<[number, number]>[] = [];
  const resultsBucketsOfSamples: Array<[string, number[]]>[] = [];
  for (const result of results) {
    resultsNumbersOfSamples.push(result.numbersOfSamples);
    resultsBucketsOfSamples.push(
      result.cases.map((myCases) => [result.levelName, myCases])
    );
    resultsValues.push(result.performances.map((perf) => perf.value));
    resultsConfidenceScores.push(
      result.performances.map((perf) => unwrapConfidence(perf))
    );
  }

  return (
    <Col span={colSpan} key={resultFirst.featureDescription}>
      <BarChart
        title={title}
        seriesNames={systemNames}
        xAxisData={bucketNames}
        seriesDataList={resultsValues}
        seriesLabelsList={resultsValues}
        numbersOfSamplesList={resultsNumbersOfSamples}
        confidenceScoresList={resultsConfidenceScores}
        onBarClick={async (barIndex: number, systemIndex: number) => {
          // Get examples of a certain bucket from all systems
          const bucketOfSamplesList = resultsBucketsOfSamples.map(
            (bucketsOfSamples) => {
              return bucketsOfSamples[barIndex];
            }
          );
          const bucketOfCasesPromiseList = bucketOfSamplesList.map(
            (bucketOfSamples, i) => {
              return backendClient.systemCasesGetById(
                systems[i].system_id,
                bucketOfSamples[0],
                bucketOfSamples[1]
              );
            }
          );
          const bucketOfCasesList = await Promise.all(bucketOfCasesPromiseList);
          setActiveSystemExamples({
            title,
            barIndex,
            systemIndex,
            bucketOfCasesList,
          });
          resetPage();
        }}
      />
      {bucketSlider}
    </Col>
  );
}
