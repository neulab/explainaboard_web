import React from "react";
import { BarChart } from "../..";
import { SystemAnalysesReturn } from "../../../clients/openapi";
import { SystemModel } from "../../../models";
import { getOverallMap, unwrapConfidence } from "../utils";
import { AnalysisPanel } from "./AnalysisPanel";
interface Props {
  systems: SystemModel[];
  systemAnalyses: SystemAnalysesReturn["system_analyses"];
  metricNames: string[];
  onBarClick: (metricName: string) => void;
}

/** A bar chart that shows overall metrics. Each bar represents a different
 *  metric. */
export function OverallMetricsBarChart({
  systems,
  systemAnalyses,
  metricNames,
  onBarClick,
}: Props) {
  const systemNames = systems.map((system) => system.system_name);
  const resultsValues: number[][] = [];
  const resultsNumbersOfSamples: number[][] = [];
  const resultsConfidenceScores: Array<[number, number]>[] = [];
  // The metric names that exist in overall results
  for (const analysis of systemAnalyses) {
    const overallMap = getOverallMap(analysis.system_info.results.overall);
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
        xAxisName="metric"
        yAxisName="score"
        seriesDataList={resultsValues}
        seriesLabelsList={resultsValues}
        confidenceScoresList={resultsConfidenceScores}
        numbersOfSamplesList={resultsNumbersOfSamples}
        onBarClick={(barIndex: number) => onBarClick(metricNames[barIndex])}
      />
    </AnalysisPanel>
  );
}
