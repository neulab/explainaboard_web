import React, { useState } from "react";
import { Analysis } from "./types";
import { SystemAnalysis } from "../../clients/openapi";
import { parse } from "./parser";
import { BarChart } from "../../components";
import { Row, Col } from "antd";

interface Props {
  analysis: SystemAnalysis;
}

export function AnalysisReport(props: Props) {
  const [barIndex, setBarIndex] = useState<number>(-1);

  const analysis = props.analysis as Analysis;
  const resultsFineGrained = analysis["results"]["fine_grained"];
  const parsedLabels = parse(resultsFineGrained["label"]);
  const parsedSentenceLengths = parse(resultsFineGrained["sentence_length"]);
  const parsedTokenNumbers = parse(resultsFineGrained["token_number"]);

  return (
    <Row>
      <Col span={8}>
        <BarChart
          title={`${parsedLabels.metricName} by label`}
          xAxisData={parsedLabels.bucketNames}
          seriesData={parsedLabels.values}
          seriesLabels={parsedLabels.numbersOfSamples}
          confidenceScores={parsedLabels.confidenceScores}
        />
      </Col>
      <Col span={8}>
        <BarChart
          title={`${parsedLabels.metricName} by sentence length`}
          xAxisData={parsedSentenceLengths.bucketNames}
          seriesData={parsedSentenceLengths.values}
          seriesLabels={parsedSentenceLengths.numbersOfSamples}
          confidenceScores={parsedSentenceLengths.confidenceScores}
        />
      </Col>
      <Col span={8}>
        <BarChart
          title={`${parsedLabels.metricName} by token numbers`}
          xAxisData={parsedTokenNumbers.bucketNames}
          seriesData={parsedTokenNumbers.values}
          seriesLabels={parsedTokenNumbers.numbersOfSamples}
          confidenceScores={parsedTokenNumbers.confidenceScores}
        />
      </Col>
    </Row>
  );
}
