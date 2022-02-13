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
  task: string;
  analyses: SystemAnalysisModel[];
}

export function AnalysisReport(props: Props) {
  const [activeSystemCaseStudy, setActiveSystemCaseStudy] =
    useState<activeSystemCaseStudy>();
  // page number of the analysis table
  const [page, setPage] = useState(0);

  const { task, systemIDs, analyses } = props;

  // The visualization chart of a fine-grained result is displayed using the "Grid" layout by Ant Design.
  // Specifically, every chart is enclosed by <Col></Col>, and `chartNumPerRow` sets the number of charts
  // to be enclosed by <Row></Row>.
  let chartNumPerRow = 3; // Must be a factor of 24 since Ant divides a row into 24 sections!
  // pairwise analysis
  if (systemIDs.length > 1) {
    chartNumPerRow = 1;
  }

  // Array to store every parsed system analysis
  const systemAnalysesParsed: SystemAnalysisParsed[] = [];
  // Loop through each system analysis and parse
  for (let i = 0; i < systemIDs.length; i++) {
    const systemID = systemIDs[i];
    const analysis = analyses[i];
    const resultsFineGrained = analysis["results"]["fine_grained"];

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

    systemAnalysesParsed.push({
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

  // Get the parsed result from the first system for mapping
  const resultsFineGrainedParsed =
    systemAnalysesParsed[0].resultsFineGrainedParsed;

  return (
    <div style={{ textAlign: "center" }}>
      {
        // Map the resultsFineGrainedParsed of the every element in systemAnalysesParsed
        // into rows and columns. One column contains a single BarChart.
        resultsFineGrainedParsed.map((row, rowIdx) => {
          const cols = row.map((resultFirst, resultIdx) => {
            // For invariant variables across all systems, we can simply take from the first result
            const title = `${resultFirst.metricName} by ${resultFirst.title}`;
            const xAxisData = resultFirst.bucketNames;

            // System-dependent variables must be taken from all systems
            const resultsValues: number[][] = [];
            const resultsNumbersOfSamples: number[][] = [];
            const resultsConfidenceScores: Array<[number, number]>[] = [];
            const resultsBucketsOfSamples: string[][][] = [];

            // const results: ResultFineGrainedParsed[] = []
            for (let i = 0; i < systemAnalysesParsed.length; i++) {
              const result =
                systemAnalysesParsed[i].resultsFineGrainedParsed[rowIdx][
                  resultIdx
                ];
              resultsValues.push(result.values);
              resultsNumbersOfSamples.push(result.numbersOfSamples);
              resultsConfidenceScores.push(result.confidenceScores);
              resultsBucketsOfSamples.push(result.bucketsOfSamples);
            }

            return (
              <Col
                span={Math.floor(24 / chartNumPerRow)}
                key={resultFirst.title}
              >
                <BarChart
                  title={title}
                  xAxisData={xAxisData}
                  seriesDataList={resultsValues}
                  seriesLabelsList={resultsValues}
                  numbersOfSamplesList={resultsNumbersOfSamples}
                  confidenceScoresList={resultsConfidenceScores}
                  onBarClick={(barIndex: number) => {
                    // setBucketOfSample(result.bucketsOfSamples[barIndex]);
                    // setActiveSystemCaseStudy({
                    //   systemID: result.systemID,
                    //   task: result.task,
                    //   title: result.title,
                    //   metricName: result.metricName,
                    //   barIndex,
                    //   bucketOfSamples: result.bucketsOfSamples[barIndex]
                    // })
                    // reset page number
                    setPage(0);
                  }}
                />
              </Col>
            );
          });
          return <Row key={rowIdx}>{cols}</Row>;
        })
      }
      {analysisTable}
    </div>
  );
}
