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
  const parseOption = {
    bucketName: {
      format: "range",
    },
  };
  const parsedSentenceLengths = parse(
    resultsFineGrained["sentence_length"],
    parseOption
  );
  const parsedTokenNumbers = parse(
    resultsFineGrained["token_number"],
    parseOption
  );
  const seriesLabelName = "sample size";

  return (
    <Row>
      <Col span={8}>
        <BarChart
          title={`${parsedLabels.metricName} by label`}
          xAxisData={parsedLabels.bucketNames}
          seriesData={parsedLabels.values}
          seriesLabelName={seriesLabelName}
          seriesLabels={parsedLabels.numbersOfSamples}
          confidenceScores={parsedLabels.confidenceScores}
        />
      </Col>
      <Col span={8}>
        <BarChart
          title={`${parsedLabels.metricName} by sentence length`}
          xAxisData={parsedSentenceLengths.bucketNames}
          seriesData={parsedSentenceLengths.values}
          seriesLabelName={seriesLabelName}
          seriesLabels={parsedSentenceLengths.numbersOfSamples}
          confidenceScores={parsedSentenceLengths.confidenceScores}
        />
      </Col>
      <Col span={8}>
        <BarChart
          title={`${parsedLabels.metricName} by token numbers`}
          xAxisData={parsedTokenNumbers.bucketNames}
          seriesData={parsedTokenNumbers.values}
          seriesLabelName={seriesLabelName}
          seriesLabels={parsedTokenNumbers.numbersOfSamples}
          confidenceScores={parsedTokenNumbers.confidenceScores}
        />
      </Col>
    </Row>
  );
}
