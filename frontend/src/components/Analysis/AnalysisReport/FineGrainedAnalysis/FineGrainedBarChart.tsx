import React from "react";
import { Col } from "antd";
import { SystemModel } from "../../../../models";
import { BarChart } from "../../BarChart";
import { BucketSlider } from "../../BucketSlider";
import { BucketIntervals, ResultFineGrainedParsed } from "../../types";
import { unwrapConfidence } from "../../utils";

interface Props {
  systems: SystemModel[];
  featureNameToBucketInfo: { [feature: string]: BucketIntervals };
  updateFeatureNameToBucketInfo: (
    featureName: string,
    bucketInfo: BucketIntervals
  ) => void;
  title: string;
  results: ResultFineGrainedParsed[];
  onBarClick: (barIndex: number, systemIndex: number) => void;
}

export function FineGrainedBarChart(props: Props) {
  const {
    title,
    systems,
    featureNameToBucketInfo,
    updateFeatureNameToBucketInfo,
    results,
    onBarClick,
  } = props;
  // For invariant variables across all systems, we can simply take from the first result
  const systemNames = systems.map((system) => system.system_info.system_name);
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
    resultsValues.push(result.performances.map((perf) => perf.value));
    resultsConfidenceScores.push(
      result.performances.map((perf) => unwrapConfidence(perf))
    );
  }

  /** The visualization chart of a fine-grained result is displayed using the "Grid" layout by Ant Design.
    Specifically, all charts are enclosed by <Col></Col>, which are then enclosed by a single <Row></Row>.
    Ant design takes care of overflow and auto starts a new line. */
  function getColSpan() {
    // Get the maximum right bound length
    const maxRightBoundsLength = Math.max(
      ...Object.values(featureNameToBucketInfo).map(
        (bucketInfo) => bucketInfo.bounds.length
      )
    );
    if (
      maxRightBoundsLength > 5 ||
      (systems.length > 1 && maxRightBoundsLength > 3)
    ) {
      return 24;
    } else if (maxRightBoundsLength > 3 || systems.length > 1) {
      return 12;
    } else {
      return 8;
    }
  }
  const colSpan = getColSpan();

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
        onBarClick={onBarClick}
      />
      {bucketSlider}
    </Col>
  );
}
