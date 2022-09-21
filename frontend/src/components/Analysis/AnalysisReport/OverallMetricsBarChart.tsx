import React from "react";
import { BarChart } from "../..";
import { SystemModel } from "../../../models";
import { getOverallMap, unwrapConfidence } from "../utils";
import { AnalysisPanel } from "./AnalysisPanel";
interface Props {
  systems: SystemModel[];
  metricNames: string[];
  onBarClick: (metricName: string) => void;
}

/** A bar chart that shows overall metrics. Each bar represents a different
 *  metric. */
export function OverallMetricsBarChart({
  systems,
  metricNames,
  onBarClick,
}: Props) {
  const systemNames = systems.map((system) => system.system_info.system_name);
  const resultsValues: number[][] = [];
  const resultsNumbersOfSamples: number[][] = [];
  const resultsConfidenceScores: Array<[number, number]>[] = [];
  // The metric names that exist in overall results
  for (const system of systems) {
    const overallMap = getOverallMap(system.system_info.results.overall);
    const metricPerformance = [];
    const metricConfidence = [];
    const metricNumberOfSamples = [];
    for (const metricName of metricNames) {
      if (metricName in overallMap) {
        const metricResults = overallMap[metricName];
        metricPerformance.push(metricResults.value);
        metricConfidence.push(unwrapConfidence(metricResults));
      } else {
        metricPerformance.push(0);
        const noConfidence: [number, number] = [-1, -1];
        metricConfidence.push(noConfidence);
      }
      // TODO(gneubig): How can we get the dataset size?
      metricNumberOfSamples.push(-1);
    }
    resultsValues.push(metricPerformance);
    resultsConfidenceScores.push(metricConfidence);
    resultsNumbersOfSamples.push(metricNumberOfSamples);
  }
  return (
    <AnalysisPanel title="Overall Performance">
      <BarChart
        title="Overall Performance"
        seriesNames={systemNames}
        xAxisData={metricNames}
        seriesDataList={resultsValues}
        seriesLabelsList={resultsValues}
        confidenceScoresList={resultsConfidenceScores}
        numbersOfSamplesList={resultsNumbersOfSamples}
        onBarClick={(barIndex: number) => onBarClick(metricNames[barIndex])}
      />
    </AnalysisPanel>
  );
}
