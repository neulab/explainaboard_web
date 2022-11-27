import React from "react";
import { BarChart } from "../..";
import { SystemAnalysesReturn } from "../../../clients/openapi";
import { SystemModel } from "../../../models";
import { unwrapValue, unwrapConfidence, getOverallMap } from "../utils";
import { AnalysisPanel } from "./AnalysisPanel";

interface Props {
  systems: SystemModel[];
  systemAnalyses: SystemAnalysesReturn["system_analyses"];
  metricNames: string[];
  onBarClick: (metricName: string) => void;
  addChartFile: (imgName: string, base64File: string) => void;
}

/** A bar chart that shows overall metrics. Each bar represents a different
 *  metric. */
export function OverallMetricsBarChart({
  systems,
  systemAnalyses,
  metricNames,
  onBarClick,
  addChartFile,
}: Props) {
  function getSystemNames(systems: SystemModel[]) {
    const systemNames = systems.map((sys) => sys.system_name);
    const distinctSystemNames = new Set(systemNames);
    if (distinctSystemNames.size !== systemNames.length) {
      return systems.map((sys) => sys.system_name + "_" + sys.system_id);
    } else {
      return systemNames;
    }
  }
  const systemNames = getSystemNames(systems);
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
        metricPerformance.push(unwrapValue(metricResults));
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
        addChartFile={addChartFile}
      />
    </AnalysisPanel>
  );
}
