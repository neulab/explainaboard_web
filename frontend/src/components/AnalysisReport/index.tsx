import React, { useState } from "react";
import { Analysis } from "./types";
import { SystemAnalysis } from "../../clients/openapi";
import { parseLabels } from "./parser";
import { BarChart } from "../../components";
import { Row, Col } from "antd";

interface Props {
  analysis: SystemAnalysis;
}

export function AnalysisReport(props: Props) {
  const [barIndex, setBarIndex] = useState<number>(-1);

  const analysis = props.analysis as Analysis;
  const resultsFineGrained = analysis["results"]["fine_grained"];
  const labels = resultsFineGrained["label"];
  const sentence_length_analysis = resultsFineGrained["sentence_length"];
  const token_number_analysis = resultsFineGrained["token_number"];
  const {
    metricName,
    bucketNames,
    values,
    numbersOfSamples,
    confidenceScores,
  } = parseLabels(labels);

  return (
    <Row>
      <Col span={8}>
        <BarChart
          title={metricName}
          xAxisData={bucketNames}
          seriesData={values}
          seriesLabels={numbersOfSamples}
          confidenceScores={confidenceScores}
        />
      </Col>
      <Col span={8}>
        <BarChart
          title={metricName}
          xAxisData={bucketNames}
          seriesData={values}
          seriesLabels={numbersOfSamples}
          confidenceScores={confidenceScores}
        />
      </Col>
      <Col span={8}>
        <BarChart
          title={metricName}
          xAxisData={bucketNames}
          seriesData={values}
          seriesLabels={numbersOfSamples}
          confidenceScores={confidenceScores}
        />
      </Col>
    </Row>
  );
}
