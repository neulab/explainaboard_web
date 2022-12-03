import React from "react";
import { Col } from "antd";
import { SystemModel } from "../../../../models";
import { BarChart } from "../../BarChart";
import { BucketSlider } from "../../BucketSlider";
import { BucketIntervals, ResultFineGrainedParsed } from "../../types";
import { unwrapValue, unwrapConfidence, hasDuplicate } from "../../utils";

interface Props {
  systems: SystemModel[];
  featureNameToBucketInfo: { [feature: string]: BucketIntervals };
  updateFeatureNameToBucketInfo: (
    featureName: string,
    bucketInfo: BucketIntervals
  ) => void;
  colSpan: 8 | 12 | 24;
  title: string;
  results: ResultFineGrainedParsed[];
  onBarClick: (barIndex: number, systemIndex: number) => void;
  addChartFile: (imgName: string, base64File: string) => void;
}

export function FineGrainedBarChart(props: Props) {
  const {
    title,
    systems,
    featureNameToBucketInfo,
    updateFeatureNameToBucketInfo,
    colSpan,
    results,
    onBarClick,
    addChartFile,
  } = props;
  // For invariant variables across all systems, we can simply take from the first result
  function getSystemNames(systems: SystemModel[]) {
    const systemNames = systems.map((sys) => sys.system_name);
    if (hasDuplicate(systemNames)) {
      return systems.map((sys) => sys.system_name + "_" + sys.system_id);
    } else {
      return systemNames;
    }
  }
  const systemNames = getSystemNames(systems);
  const resultFirst = results[0];
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
  for (const result of results) {
    resultsNumbersOfSamples.push(result.numbersOfSamples);
    resultsValues.push(result.performances.map((perf) => unwrapValue(perf)));
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
        xAxisName={resultFirst.featureDescription}
        yAxisName={resultFirst.metricName}
        seriesDataList={resultsValues}
        seriesLabelsList={resultsValues}
        numbersOfSamplesList={resultsNumbersOfSamples}
        confidenceScoresList={resultsConfidenceScores}
        onBarClick={onBarClick}
        addChartFile={addChartFile}
      />
      {bucketSlider}
    </Col>
  );
}
