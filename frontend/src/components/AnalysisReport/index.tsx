import React, { useState } from "react";
import { Analysis } from "./types";
import { SystemAnalysis } from "../../clients/openapi";
import { parse } from "./parser";
import { BarChart, AnalysisTable } from "../../components";
import { Row, Col, Typography } from "antd";

interface Props {
  systemID: string;
  analysis: SystemAnalysis;
}

export function AnalysisReport(props: Props) {
  const [bucketOfSamples, setBucketOfSample] = useState<number[]>([]);
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

  let analysisTable;
  if (bucketOfSamples.length === 0) {
    analysisTable = (
      <Typography.Paragraph>
        Click a bar to see error cases.
      </Typography.Paragraph>
    );
  } else {
    analysisTable = <AnalysisTable />;
  }

  return (
    <div style={{ textAlign: "center" }}>
      <Row>
        <Col span={8}>
          <BarChart
            title={`${parsedLabels.metricName} by label`}
            xAxisData={parsedLabels.bucketNames}
            seriesData={parsedLabels.values}
            seriesLabelName={seriesLabelName}
            seriesLabels={parsedLabels.numbersOfSamples}
            confidenceScores={parsedLabels.confidenceScores}
            onBarClick={(barIndex: number) => {
              setBucketOfSample(parsedLabels.bucketsOfSamples[barIndex]);
            }}
          />
        </Col>
        <Col span={8}>
          <BarChart
            title={`${parsedSentenceLengths.metricName} by sentence length`}
            xAxisData={parsedSentenceLengths.bucketNames}
            seriesData={parsedSentenceLengths.values}
            seriesLabelName={seriesLabelName}
            seriesLabels={parsedSentenceLengths.numbersOfSamples}
            confidenceScores={parsedSentenceLengths.confidenceScores}
            onBarClick={(barIndex: number) => {
              setBucketOfSample(
                parsedSentenceLengths.bucketsOfSamples[barIndex]
              );
            }}
          />
        </Col>
        <Col span={8}>
          <BarChart
            title={`${parsedTokenNumbers.metricName} by token numbers`}
            xAxisData={parsedTokenNumbers.bucketNames}
            seriesData={parsedTokenNumbers.values}
            seriesLabelName={seriesLabelName}
            seriesLabels={parsedTokenNumbers.numbersOfSamples}
            confidenceScores={parsedTokenNumbers.confidenceScores}
            onBarClick={(barIndex: number) => {
              setBucketOfSample(parsedTokenNumbers.bucketsOfSamples[barIndex]);
            }}
          />
        </Col>
      </Row>
      {analysisTable}
    </div>
  );
}
