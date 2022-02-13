import React, { useState } from "react";
import { ResultFineGrainedParsed } from "./types";
import { parse, compareBucketOfSamples } from "./utils";
import { BarChart, AnalysisTable } from "../../components";
import { Row, Col, Typography, Space, Tabs } from "antd";
import { SystemAnalysisModel } from "../../models";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface SystemAnalysisParsed {
  resultsFineGrainedParsed: Array<ResultFineGrainedParsed[]>;
  // an element is a object key of a feature
  // used for retrieving the value from resultsFineGrainedParsed
  featureKeys: string[];
  // an element is a description/name of a feature to be displayed in the UI
  descriptions: string[];
}

// Examples to be shown in the analysis table when a bar is clicked
interface ActiveSystemExamples {
  // invariant information across systems
  // but depends on which bar or graph is clicked.
  title: string;
  barIndex: number;

  // These are technically not invariant across sytems,
  // but they may be in the future, and it's easier to keep them here for now.
  featureKeys: string[];
  descriptions: string[];

  // system-dependent information across systems
  systemIndex: number;
  // TODO the latter type is for NER | {[key: string]: string}[]
  bucketOfSamplesList: string[][];
}

interface Props {
  systemIDs: string[];
  systemNames: string[];
  task: string;
  analyses: SystemAnalysisModel[];
}

export function AnalysisReport(props: Props) {
  const [activeSystemExamples, setActiveSystemExamples] =
    useState<ActiveSystemExamples>();
  // page number of the analysis table
  const [page, setPage] = useState(0);

  const { task, systemIDs, systemNames, analyses } = props;

  // The visualization chart of a fine-grained result is displayed using the "Grid" layout by Ant Design.
  // Specifically, every chart is enclosed by <Col></Col>, and `chartNumPerRow` sets the number of charts
  // to be enclosed by <Row></Row>.
  let chartNumPerRow = 3; // Must be a factor of 24 since Ant divides a row into 24 sections!
  // pairwise analysis
  if (systemIDs.length > 1) {
    chartNumPerRow = 2;
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
    const featureKeys: string[] = [];
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
        resultsFineGrainedParsed[rowIdx][chartNum] = {
          systemID,
          description,
          ...parse(task, resultsFineGrained[key]),
        };
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
  if (activeSystemExamples !== undefined) {
    const {
      title,
      barIndex,
      featureKeys,
      descriptions,
      systemIndex,
      bucketOfSamplesList,
    } = activeSystemExamples;

    // Sort bucket of samples for every system
    const sortedBucketOfSamplesList = bucketOfSamplesList.map(
      (bucketOfSamples) => {
        return bucketOfSamples.sort(compareBucketOfSamples);
      }
    );

    // single analysis
    if (systemIDs.length === 1) {
      analysisTable = (
        <AnalysisTable
          systemID={systemIDs[0]}
          task={task}
          outputIDs={sortedBucketOfSamplesList[0]}
          featureKeys={featureKeys}
          descriptions={descriptions}
          page={page}
          setPage={setPage}
        />
      );
      // pairwise analysis
    } else if (systemIDs.length === 2) {
      analysisTable = (
        <Space style={{ width: "fit-content" }}>
          <Tabs
            activeKey={`${systemIndex}`}
            onChange={(activeKey) =>
              setActiveSystemExamples({
                ...activeSystemExamples,
                systemIndex: Number(activeKey),
              })
            }
          >
            {systemIDs.map((_, sysIDIndex) => {
              return (
                <TabPane tab={systemNames[sysIDIndex]} key={`${sysIDIndex}`}>
                  <AnalysisTable
                    systemID={systemIDs[sysIDIndex]}
                    task={task}
                    outputIDs={sortedBucketOfSamplesList[sysIDIndex]}
                    featureKeys={featureKeys}
                    descriptions={descriptions}
                    page={page}
                    setPage={setPage}
                  />
                </TabPane>
              );
            })}
          </Tabs>
        </Space>
      );
    }

    const barText = systemIDs.length === 1 ? "bar" : "bars";
    analysisTable = (
      <div>
        <Title level={4}>{`Examples from ${barText} #${
          barIndex + 1
        } in ${title}`}</Title>
        <Space style={{ width: "fit-content", float: "left" }}>
          <Text>
            {
              "Note: Long texts are truncated. To view the full text, hover your cursor on the cell."
            }
          </Text>
        </Space>
        {analysisTable}
      </div>
    );
  }

  // Get the parsed result from the first system for mapping
  // featureKeys and descriptions are invariant information
  // used in
  const { resultsFineGrainedParsed, featureKeys, descriptions } =
    systemAnalysesParsed[0];

  return (
    <div style={{ textAlign: "center" }}>
      {
        // Map the resultsFineGrainedParsed of the every element in systemAnalysesParsed
        // into rows and columns. One column contains a single BarChart.
        resultsFineGrainedParsed.map((row, rowIdx) => {
          const cols = row.map((resultFirst, resultIdx) => {
            // For invariant variables across all systems, we can simply take from the first result
            const title = `${resultFirst.metricName} by ${resultFirst.description}`;
            const xAxisData = resultFirst.bucketNames;

            // System-dependent variables must be taken from all systems
            const resultsValues: number[][] = [];
            const resultsNumbersOfSamples: number[][] = [];
            const resultsConfidenceScores: Array<[number, number]>[] = [];
            const resultsBucketsOfSamples: string[][][] = [];
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
                key={resultFirst.description}
              >
                <BarChart
                  title={title}
                  seriesNames={systemNames}
                  xAxisData={xAxisData}
                  seriesDataList={resultsValues}
                  seriesLabelsList={resultsValues}
                  numbersOfSamplesList={resultsNumbersOfSamples}
                  confidenceScoresList={resultsConfidenceScores}
                  onBarClick={(barIndex: number, systemIndex: number) => {
                    // Get examples of a certain bucket from all systems
                    const bucketOfSamplesList = resultsBucketsOfSamples.map(
                      (bucketsOfSamples) => {
                        return bucketsOfSamples[barIndex];
                      }
                    );
                    setActiveSystemExamples({
                      title,
                      barIndex,
                      systemIndex,
                      featureKeys,
                      descriptions,
                      bucketOfSamplesList,
                    });
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
