import React, { useState } from "react";
import {
  MetricToSystemAnalysesParsed,
  ActiveSystemExamples,
  FeatureKeyToUIBucketInfo,
  UIBucketInfo,
} from "../types";
import { compareBucketOfSamples } from "../utils";
import { BarChart, AnalysisTable } from "../../../components";
import { Row, Col, Typography, Space, Tabs } from "antd";
import { SystemModel } from "../../../models";
import { SystemAnalysesReturn } from "../../../clients/openapi";
import { BucketSlider } from "../BucketSlider";

const { Title } = Typography;
const { TabPane } = Tabs;

interface Props {
  task: string;
  systems: SystemModel[];
  singleAnalyses: SystemAnalysesReturn["single_analyses"];
  metricToSystemAnalysesParsed: MetricToSystemAnalysesParsed;
  featureKeyToBucketInfo: FeatureKeyToUIBucketInfo;
  updateFeatureKeyToBucketInfo: (
    featureKey: string,
    bucketInfo: UIBucketInfo
  ) => void;
}

export function AnalysisReport(props: Props) {
  const {
    task,
    systems,
    metricToSystemAnalysesParsed,
    featureKeyToBucketInfo,
    updateFeatureKeyToBucketInfo,
  } = props;
  const systemIDs = systems.map((system) => system.system_id);
  const systemNames = systems.map((system) => system.system_info.model_name);
  const metricNames = Object.keys(metricToSystemAnalysesParsed);
  const [activeMetric, setActiveMetric] = useState<string>(metricNames[0]);
  const [activeSystemExamples, setActiveSystemExamples] =
    useState<ActiveSystemExamples>();
  // page number of the analysis table
  const [page, setPage] = useState(0);

  let maxRightBoundsLength = 0;
  for (const bucketInfo of Object.values(featureKeyToBucketInfo)) {
    maxRightBoundsLength = Math.max(
      maxRightBoundsLength,
      bucketInfo.rightBounds.length
    );
  }

  /* The visualization chart of a fine-grained result is displayed using the "Grid" layout by Ant Design.
  Specifically, all charts are enclosed by <Col></Col>, which are then enclosed by a single <Row></Row>. 
  Ant design takes care of overflow and auto starts a new line.
  */
  // Must be a factor of 24 since Ant divides a design area into 24 sections!
  let colSpan = 8;
  if (maxRightBoundsLength > 5) {
    colSpan = 24;
  } else if (maxRightBoundsLength > 3) {
    colSpan = 12;
  }
  // pairwise analysis needs more column space to display two systems
  if (systemIDs.length > 1) {
    colSpan = 12;
    if (maxRightBoundsLength > 3) {
      colSpan = 24;
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
            <Row>
              {
                // Map the resultsFineGrainedParsed of the every element in systemAnalysesParsed
                // into columns. One column contains a single BarChart.
                resultsFineGrainedParsed.map((resultFirst, resultIdx) => {
                  // For invariant variables across all systems, we can simply take from the first result
                  const title = `${resultFirst.metricName} by ${resultFirst.description}`;
                  const bucketNames = resultFirst.bucketNames;
                  const featureKey = resultFirst.featureKey;
                  const isBucketAdjustable =
                    featureKey in featureKeyToBucketInfo;
                  let bucketSlider = null;
                  if (isBucketAdjustable) {
                    const bucketInfo = featureKeyToBucketInfo[featureKey];
                    const bucketRightBounds = bucketInfo.rightBounds;
                    if (bucketRightBounds !== undefined) {
                      const bucketMin = bucketInfo.min;
                      const bucketMax = bucketInfo.max;
                      const bucketStep = resultFirst.bucketStep;
                      bucketSlider = (
                        <BucketSlider
                          min={bucketMin}
                          max={bucketMax}
                          marks={{
                            [bucketMin]: bucketMin.toFixed(2),
                            [bucketMax]: bucketMax.toFixed(2),
                          }}
                          step={bucketStep}
                          inputValues={bucketRightBounds}
                          onChange={(rightBounds) => {
                            updateFeatureKeyToBucketInfo(featureKey, {
                              min: bucketMin,
                              max: bucketMax,
                              rightBounds: rightBounds,
                              updated: true,
                            });
                          }}
                        />
                      );
                    }
                  }

                  // System-dependent variables must be taken from all systems
                  const resultsValues: number[][] = [];
                  const resultsNumbersOfSamples: number[][] = [];
                  const resultsConfidenceScores: Array<[number, number]>[] = [];
                  const resultsBucketsOfSamples: string[][][] = [];
                  for (let i = 0; i < systemAnalysesParsed.length; i++) {
                    const result =
                      systemAnalysesParsed[i].resultsFineGrainedParsed[
                        resultIdx
                      ];
                    resultsValues.push(result.values);
                    resultsNumbersOfSamples.push(result.numbersOfSamples);
                    resultsConfidenceScores.push(result.confidenceScores);
                    resultsBucketsOfSamples.push(result.bucketsOfSamples);
                  }

                  return (
                    <Col span={colSpan} key={resultFirst.description}>
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
                      {bucketSlider}
                    </Col>
                  );
                })
              }
            </Row>
            {analysisTable}
          </TabPane>
        );
      })}
    </Tabs>
  );
}
