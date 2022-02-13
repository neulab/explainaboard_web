import React, { useState } from "react";
import { ResultFineGrainedParsed } from "./types";
import { parse } from "./parser";
import { BarChart, AnalysisTable } from "../../components";
import { Row, Col, Typography, Space } from "antd";
import { SystemAnalysisModel } from "../../models";

const { Title, Text } = Typography;

interface SystemAnalysisParsed {
  resultsFineGrainedParsed: Array<ResultFineGrainedParsed[]>;
  featureKeys: string[];
  descriptions: string[];
}

interface activeSystemCaseStudy {
  systemID: string;
  task: string;
  title: string;
  metricName: string;
  featureKeys: string[];
  descriptions: string[];
  barIndex: number;
  // TODO the latter type is for NER | {[key: string]: string}[]
  bucketOfSamples: string[];
}

interface Props {
  systemIDs: string[];
  systemID: string;
  task: string;
  analyses: SystemAnalysisModel[];
  analysis: SystemAnalysisModel;
}

export function AnalysisReport(props: Props) {
  const [activeSystemCaseStudy, setActiveSystemCaseStudy] =
    useState<activeSystemCaseStudy>();
  // page number of the analysis table
  const [page, setPage] = useState(0);

  const { systemID, task, analysis, systemIDs, analyses } = props;
  const resultsFineGrained = analysis["results"]["fine_grained"];

  // The visualization chart of a fine-grained result is displayed using the "Grid" layout by Ant Design.
  // Specifically, every chart is enclosed by <Col></Col>, and `chartNumPerRow` sets the number of charts
  // to be enclosed by <Row></Row>.
  let chartNumPerRow = 3; // Must be a factor of 24 since Ant divides a row into 24 sections!
  // pair-wise analysis
  if (systemIDs.length > 1) {
    chartNumPerRow = 1;
  }

  // Array to store every parsed system analysis
  const systemAnalysisParsed: SystemAnalysisParsed[] = [];
  // Loop through each system analysis and parse
  for (let i = 0; i < systemIDs.length; i++) {
    const analysis = analyses[i];

    // the parsed fine-grained results, used for visualization
    const resultsFineGrainedParsed: Array<ResultFineGrainedParsed[]> = [
      new Array<ResultFineGrainedParsed>(chartNumPerRow),
    ];
    // the object key of a feature, used for retrieving the value
    const featureKeys: string[] = [];
    // the description of a feature, used for displaying in the UI
    const descriptions: string[] = [];

    let rowIdx = 0;
    let chartNum = 0;
    for (const [key, featureVal] of Object.entries(analysis["features"])) {
      const description = featureVal["description"] || key;
      featureKeys.push(key);
      descriptions.push(description);

      // If a feature is bucket, it can be plotted in the bar chart.
      if (featureVal.is_bucket) {
        if (chartNum === chartNumPerRow) {
          chartNum = 0;
          resultsFineGrainedParsed.push(
            new Array<ResultFineGrainedParsed>(chartNumPerRow)
          );
          rowIdx += 1;
        }
        resultsFineGrainedParsed[rowIdx][chartNum] = parse(
          systemID,
          task,
          description,
          resultsFineGrained[key]
        );
        chartNum += 1;
      }
    }

    systemAnalysisParsed.push({
      featureKeys,
      descriptions,
      resultsFineGrainedParsed,
    });
  }

  // No bar selected
  let analysisTable = (
    <Typography.Title level={5}>
      Click a bar to see detailed cases of the system output.
    </Typography.Title>
  );

  // If a bar is selected
  if (activeSystemCaseStudy !== undefined) {
    const {
      systemID,
      task,
      title,
      metricName,
      featureKeys,
      descriptions,
      barIndex,
      bucketOfSamples,
    } = activeSystemCaseStudy;
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
        // TODO detailed title
        <Title level={4}>`Case Study (Bar ${barIndex + 1} in TODO`</Title>
        <Space style={{ width: "fit-content", float: "left" }}>
          <Text>
            {
              "Note: Long texts are truncated. To view the full text, hover your cursor on the truncated text."
            }
          </Text>
        </Space>
        <AnalysisTable
          systemID={systemID}
          task={task}
          outputIDs={sortedBucketOfSamples}
          featureKeys={featureKeys}
          descriptions={descriptions}
          page={page}
          setPage={setPage}
        />
      </div>
    );
  }

  const resultsFineGrainedParsed =
    systemAnalysisParsed[0].resultsFineGrainedParsed;
  console.log(systemAnalysisParsed);
  return (
    <div style={{ textAlign: "center" }}>
      {/* {resultsFineGrainedParsed.map(function (row, rowIdx) {
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
                  setActiveSystemCaseStudy({
                    systemID: result.systemID,
                    task: result.task,
                    title: result.title,
                    metricName: result.metricName,
                    barIndex,
                    bucketOfSamples: result.bucketsOfSamples[barIndex]
                  })
                  // reset page number
                  setPage(0);
                }}
              />
            </Col>
          );
        });
        return <Row key={rowIdx}>{cols}</Row>;
      })}
      {analysisTable} */}
    </div>
  );
}
