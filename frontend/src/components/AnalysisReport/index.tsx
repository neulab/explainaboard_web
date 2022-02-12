import React, { useState } from "react";
import { ResultFineGrainedParsed } from "./types";
import { parse } from "./parser";
import { BarChart, AnalysisTable } from "../../components";
import { Row, Col, Typography } from "antd";
import { SystemAnalysisModel } from "../../models";

interface Props {
  systemID: string;
  task: string;
  analysis: SystemAnalysisModel;
}

export function AnalysisReport(props: Props) {
  // TODO the latter type is for NER | {[key: string]: string}[]
  const [bucketOfSamples, setBucketOfSample] = useState<string[]>([]);
  const task = props.task;
  const analysis = props.analysis;
  const resultsFineGrained = analysis["results"]["fine_grained"];

  // The visualization chart of a fine grained result is displayed using the "Grid" layout by Ant Design.
  // Specifically, every chart is enclosed by <Col></Col>, and `chartNumPerRow` sets the number of charts
  // to be enclosed by <Row></Row>.

  // Must be a factor of 24 since Ant divides a row into 24 sections!
  const chartNumPerRow = 3;
  const resultsFineGrainedParsed: Array<ResultFineGrainedParsed[]> = [
    new Array<ResultFineGrainedParsed>(chartNumPerRow),
  ];
  const featureKeys: string[] = [];
  const descriptions: string[] = [];

  let rowIdx = 0;
  let chartNum = 0;
  for (const [key, featureVal] of Object.entries(analysis["features"])) {
    const description = featureVal["description"] || key;
    featureKeys.push(key);
    descriptions.push(description);
    if (featureVal.is_bucket) {
      if (chartNum === chartNumPerRow) {
        chartNum = 0;
        resultsFineGrainedParsed.push(
          new Array<ResultFineGrainedParsed>(chartNumPerRow)
        );
        rowIdx += 1;
      }
      resultsFineGrainedParsed[rowIdx][chartNum] = parse(
        task,
        description,
        resultsFineGrained[key]
      );
      chartNum += 1;
    }
  }

  let analysisTable;
  if (bucketOfSamples.length === 0) {
    analysisTable = (
      <Typography.Title level={5}>
        Click a bar to see detailed cases of the system output.
      </Typography.Title>
    );
  } else {
    const sortedBucketOfSamples = bucketOfSamples.sort((a, b) => {
      const numA = Number(a);
      const numB = Number(b);
      if (Number.isInteger(numA) && Number.isInteger(numB)) {
        return numA - numB;
      } else if (typeof a === "string" && typeof a === "string") {
        if (a > b) {
          return 1;
        } else if (a < b) {
          return -1;
        }
      }
      return 0;
    });
    analysisTable = (
      <div>
        <Typography.Title level={4}>Case Study </Typography.Title>
        <AnalysisTable
          systemID={props.systemID}
          task={task}
          outputIDs={sortedBucketOfSamples}
          featureKeys={featureKeys}
          descriptions={descriptions}
        />
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      {resultsFineGrainedParsed.map(function (row, rowIdx) {
        const cols = row.map(function (result) {
          return (
            <Col span={Math.floor(24 / chartNumPerRow)} key={result.title}>
              <BarChart
                title={`${result.metricName} by ${result.title}`}
                xAxisData={result.bucketNames}
                seriesData={result.values}
                seriesLabels={result.values}
                numbersOfSamples={result.numbersOfSamples}
                confidenceScores={result.confidenceScores}
                onBarClick={(barIndex: number) => {
                  setBucketOfSample(result.bucketsOfSamples[barIndex]);
                }}
              />
            </Col>
          );
        });
        return <Row key={rowIdx}>{cols}</Row>;
      })}
      {analysisTable}
    </div>
  );
}
