import React, { useState } from "react";
import {
  ResultFineGrainedParsed,
  SystemAnalysisParsed,
  MetricToSystemAnalysesParsed,
  ActiveSystemExamples,
} from "./types";
import { parse, compareBucketOfSamples } from "./utils";
import { BarChart, AnalysisTable } from "../..";
import { Row, Col, Typography, Space, Tabs } from "antd";
import { SystemModel } from "../../../models";
import {
  SingleAnalysisReturn,
  SystemAnalysesReturn,
} from "../../../clients/openapi";
import { BucketSlider } from "../BucketSlider";

const { Title } = Typography;
const { TabPane } = Tabs;

interface Props {
  systemIDs: string[];
  systems: SystemModel[];
  singleAnalyses: SystemAnalysesReturn["single_analyses"];
}

export function AnalysisReport(props: Props) {
  const { systemIDs, systems, singleAnalyses } = props;
  /*
  Take from the first element as the task and type/number of metrics should be 
  invariant across sytems in pairwise analysis
  */
  const firstSystemInfo = systems[0].system_info;
  const task = firstSystemInfo.task_name;
  const metricNames = firstSystemInfo.metric_names;
  const systemNames = systems.map((sys) => sys.system_info.model_name);
  const metricToSystemAnalysesParsed: MetricToSystemAnalysesParsed = {};
  for (const metricName of metricNames) {
    // Array to store every parsed system analysis
    metricToSystemAnalysesParsed[metricName] = [];
  }

  const [activeMetric, setActiveMetric] = useState<string>(metricNames[0]);
  const [activeSystemExamples, setActiveSystemExamples] =
    useState<ActiveSystemExamples>();
  // page number of the analysis table
  const [page, setPage] = useState(0);

  /* The visualization chart of a fine-grained result is displayed using the "Grid" layout by Ant Design.
  Specifically, every chart is enclosed by <Col></Col>, and `chartNumPerRow` sets the number of charts
  to be enclosed by <Row></Row>. 
  */
  // Must be a factor of 24 since Ant divides a row into 24 sections!
  let chartNumPerRow = 3;
  // pairwise analysis
  if (systemIDs.length > 1) {
    chartNumPerRow = 2;
  }

  // Loop through each system analysis and parse
  for (let i = 0; i < systemIDs.length; i++) {
    const systemID = systemIDs[i];
    const singleAnalysis: SingleAnalysisReturn = singleAnalyses[systemID];

    const metricToParsedInfo: {
      [key: string]: {
        resultsFineGrainedParsed: Array<ResultFineGrainedParsed>[];
        rowIdx: number;
        chartNum: number;
      };
    } = {};
    for (const metric of metricNames) {
      metricToParsedInfo[metric] = {
        // the parsed fine-grained results, used for visualization
        resultsFineGrainedParsed: [
          new Array<ResultFineGrainedParsed>(chartNumPerRow),
        ],
        rowIdx: 0,
        chartNum: 0,
      };
    }

    const featureKeyToDescription: SystemAnalysisParsed["featureKeyToDescription"] =
      {};

    for (const [featureKey, feature] of Object.entries(singleAnalysis)) {
      // TODO do we need a sentence-like description for each feature?
      const description = featureKey;

      // Add a row if the current row is full
      for (const parsedInfo of Object.values(metricToParsedInfo)) {
        if (parsedInfo.chartNum === chartNumPerRow) {
          parsedInfo.chartNum = 0;
          parsedInfo.resultsFineGrainedParsed.push(
            new Array<ResultFineGrainedParsed>(chartNumPerRow)
          );
          parsedInfo.rowIdx += 1;
        }
      }
      const metricToResultFineGrainedParsed = parse(
        systemID,
        task,
        metricNames,
        description,
        feature
      );
      for (const [metric, resultFineGrainedParsed] of Object.entries(
        metricToResultFineGrainedParsed
      )) {
        const rowIdx = metricToParsedInfo[metric].rowIdx;
        const chartNum = metricToParsedInfo[metric].chartNum;
        metricToParsedInfo[metric].resultsFineGrainedParsed[rowIdx][chartNum] =
          resultFineGrainedParsed;
        metricToParsedInfo[metric].chartNum += 1;
      }
    }

    for (const [metric, parsedInfo] of Object.entries(metricToParsedInfo)) {
      const { resultsFineGrainedParsed } = parsedInfo;
      metricToSystemAnalysesParsed[metric].push({
        featureKeyToDescription,
        resultsFineGrainedParsed,
      });
    }
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
      featureKeyToDescription,
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
          featureKeyToDescription={featureKeyToDescription}
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
                    featureKeyToDescription={featureKeyToDescription}
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
    const exampleText = task === "summarization" ? "Examples" : "Error cases";
    analysisTable = (
      <div>
        <Title level={4}>{`${exampleText} from ${barText} #${
          barIndex + 1
        } in ${title}`}</Title>
        {analysisTable}
      </div>
    );
  }

  return (
    <Tabs
      activeKey={activeMetric}
      onChange={(activeKey) => {
        setActiveMetric(activeKey);
        setActiveSystemExamples(undefined);
      }}
    >
      {metricNames.map((metric, _) => {
        const systemAnalysesParsed = metricToSystemAnalysesParsed[metric];
        /*Get the parsed result from the first system for mapping.
          FeatureKeys and descriptions are invariant information
          */
        const { resultsFineGrainedParsed, featureKeyToDescription } =
          systemAnalysesParsed[0];
        return (
          <TabPane tab={metric} key={metric}>
            {
              // Map the resultsFineGrainedParsed of the every element in systemAnalysesParsed
              // into rows and columns. One column contains a single BarChart.
              resultsFineGrainedParsed.map((row, rowIdx) => {
                const cols = row.map((resultFirst, resultIdx) => {
                  // For invariant variables across all systems, we can simply take from the first result
                  const title = `${resultFirst.metricName} by ${resultFirst.description}`;
                  const bucketNames = resultFirst.bucketNames;
                  const bucketMin = resultFirst.bucketMin;
                  const bucketMax = resultFirst.bucketMax;
                  const bucketStep = resultFirst.bucketStep;
                  const bucketRightBounds = resultFirst.bucketRightBounds;

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
                        xAxisData={bucketNames}
                        seriesDataList={resultsValues}
                        seriesLabelsList={resultsValues}
                        numbersOfSamplesList={resultsNumbersOfSamples}
                        confidenceScoresList={resultsConfidenceScores}
                        onBarClick={(barIndex: number, systemIndex: number) => {
                          // Get examples of a certain bucket from all systems
                          const bucketOfSamplesList =
                            resultsBucketsOfSamples.map((bucketsOfSamples) => {
                              return bucketsOfSamples[barIndex];
                            });
                          setActiveSystemExamples({
                            title,
                            barIndex,
                            systemIndex,
                            featureKeyToDescription,
                            bucketOfSamplesList,
                          });
                          // reset page number
                          setPage(0);
                        }}
                      />
                      <BucketSlider
                        min={bucketMin}
                        max={bucketMax}
                        marks={{
                          [bucketMin]: bucketMin.toFixed(2),
                          [bucketMax]: bucketMax.toFixed(2),
                        }}
                        step={bucketStep}
                        initialInputValues={bucketRightBounds}
                      />
                    </Col>
                  );
                });
                return <Row key={rowIdx}>{cols}</Row>;
              })
            }
            {analysisTable}
          </TabPane>
        );
      })}
    </Tabs>
  );
}
