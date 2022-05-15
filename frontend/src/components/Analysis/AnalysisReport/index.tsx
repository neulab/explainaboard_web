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
import { BucketCase, SystemAnalysesReturn } from "../../../clients/openapi";
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

export function getColSpan(props: Props) {
  /* The visualization chart of a fine-grained result is displayed using the "Grid" layout by Ant Design.
  Specifically, all charts are enclosed by <Col></Col>, which are then enclosed by a single <Row></Row>.
  Ant design takes care of overflow and auto starts a new line.
  */
  // Get the size of the column span
  const { systems, featureKeyToBucketInfo } = props;

  // Get the maximum right bound length
  const maxRightBoundsLength = Math.max(
    ...Object.values(featureKeyToBucketInfo).map(
      (bucketInfo) => bucketInfo.rightBounds.length
    )
  );
  if (
    maxRightBoundsLength > 5 ||
    (systems.length > 1 && maxRightBoundsLength > 3)
  ) {
    return 24;
  } else if (maxRightBoundsLength > 3 || systems.length > 1) {
    return 12;
  } else {
    return 8;
  }
}

export function createOverallBarChart(
  props: Props,
  colSpan: number,
  setActiveMetric: React.Dispatch<React.SetStateAction<string>>,
  setActiveSystemExamples: React.Dispatch<
    React.SetStateAction<ActiveSystemExamples | undefined>
  >,
  setPage: React.Dispatch<React.SetStateAction<number>>
) {
  const {
    systems,
    metricToSystemAnalysesParsed,
    // featureKeyToBucketInfo,
    // updateFeatureKeyToBucketInfo,
  } = props;
  const systemNames = systems.map((system) => system.system_info.model_name);
  const metricNames = Object.keys(metricToSystemAnalysesParsed);

  const resultsValues: number[][] = [];
  const resultsNumbersOfSamples: number[][] = [];
  const resultsConfidenceScores: Array<[number, number]>[] = [];
  for (let j = 0; j < systems.length; j++) {
    // const metric = metricNames[i]
    // const systemAnalysesParsed = metricToSystemAnalysesParsed[metric];
    const metricPerformance = [];
    const metricConfidence = [];
    const metricNumberOfSamples = [];
    for (let i = 0; i < metricNames.length; i++) {
      // TODO(gneubig): Replace these with actual values
      // const result =
      //     systemAnalysesParsed[i].resultsFineGrainedParsed[resultIdx];
      metricPerformance.push(0.5);
      const metricSystemConfidence: [number, number] = [0.4, 0.6];
      metricConfidence.push(metricSystemConfidence);
      metricNumberOfSamples.push(1000);
    }
    resultsValues.push(metricPerformance);
    resultsConfidenceScores.push(metricConfidence);
    resultsNumbersOfSamples.push(metricNumberOfSamples);
  }

  console.log(`systemNames=${systemNames}`);
  console.log(`metricNames=${metricNames}`);

  return (
    <Col span={colSpan}>
      <BarChart
        title="Overall Performance"
        seriesNames={systemNames}
        xAxisData={metricNames}
        seriesDataList={resultsValues}
        seriesLabelsList={resultsValues}
        confidenceScoresList={resultsConfidenceScores}
        numbersOfSamplesList={resultsNumbersOfSamples}
        onBarClick={(barIndex: number, systemIndex: number) => {
          // Get examples of a certain bucket from all systems
          setActiveMetric(metricNames[barIndex]);
          // reset page number
          setPage(0);
        }}
      />
    </Col>
  );
}

export function createExampleTable(
  props: Props,
  activeSystemExamples: ActiveSystemExamples | undefined,
  setActiveSystemExamples: React.Dispatch<
    React.SetStateAction<ActiveSystemExamples | undefined>
  >,
  page: number,
  setPage: React.Dispatch<React.SetStateAction<number>>
) {
  // Create a table full of examples
  let exampleTable = <div>&nbsp;</div>;
  if (activeSystemExamples === undefined) {
    return exampleTable;
  }

  const { task, systems } = props;
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
  if (systems.length === 1) {
    exampleTable = (
      <AnalysisTable
        systemID={systems[0].system_id}
        task={task}
        outputIDs={sortedBucketOfSamplesList[0]}
        featureKeyToDescription={featureKeyToDescription}
        page={page}
        setPage={setPage}
      />
    );
    // pairwise analysis
  } else if (systems.length === 2) {
    exampleTable = (
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
          {systems.map((system, sysIndex) => {
            return (
              <TabPane tab={system.system_info.model_name} key={`${sysIndex}`}>
                <AnalysisTable
                  systemID={system.system_id}
                  task={task}
                  outputIDs={sortedBucketOfSamplesList[sysIndex]}
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

  const barText = systems.length === 1 ? "bar" : "bars";
  const exampleText = task === "summarization" ? "Examples" : "Error cases";
  exampleTable = (
    <div>
      <Title level={4}>{`${exampleText} from ${barText} #${
        barIndex + 1
      } in ${title}`}</Title>
      {exampleTable}
    </div>
  );
  return exampleTable;
}

export function createMetricPane(
  props: Props,
  metric: string,
  colSpan: number,
  exampleTable: JSX.Element,
  setActiveSystemExamples: React.Dispatch<
    React.SetStateAction<ActiveSystemExamples | undefined>
  >,
  setPage: React.Dispatch<React.SetStateAction<number>>
) {
  const {
    systems,
    metricToSystemAnalysesParsed,
    featureKeyToBucketInfo,
    updateFeatureKeyToBucketInfo,
  } = props;
  const systemNames = systems.map((system) => system.system_info.model_name);

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
            const isBucketAdjustable = featureKey in featureKeyToBucketInfo;
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
            const resultsBucketsOfSamples: BucketCase[][][] = [];
            for (let i = 0; i < systemAnalysesParsed.length; i++) {
              const result =
                systemAnalysesParsed[i].resultsFineGrainedParsed[resultIdx];
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
                    const bucketOfSamplesList = resultsBucketsOfSamples.map(
                      (bucketsOfSamples) => {
                        return bucketsOfSamples[barIndex];
                      }
                    );
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
      {exampleTable}
    </TabPane>
  );
}

export function AnalysisReport(props: Props) {
  const { metricToSystemAnalysesParsed } = props;
  const metricNames = Object.keys(metricToSystemAnalysesParsed);
  const [activeMetric, setActiveMetric] = useState<string>(metricNames[0]);
  const [activeSystemExamples, setActiveSystemExamples] =
    useState<ActiveSystemExamples>();
  // page number of the analysis table
  const [page, setPage] = useState(0);

  // Create the example table if a bar is selected, empty element if not
  const exampleTable = createExampleTable(
    props,
    activeSystemExamples,
    setActiveSystemExamples,
    page,
    setPage
  );

  // Get column span, must be a factor of 24 since Ant divides a design area into 24 sections
  const colSpan = getColSpan(props);

  const overallBarChart = createOverallBarChart(
    props,
    colSpan,
    setActiveMetric,
    setActiveSystemExamples,
    setPage
  );

  return (
    <div>
      <Typography.Title level={3}>Overall Performance</Typography.Title>

      {overallBarChart}

      <Typography.Title level={3}>Fine-grained Performance</Typography.Title>

      <Typography.Paragraph>
        Click a bar to see detailed cases of the system output at the bottom of
        the page.
      </Typography.Paragraph>

      <Tabs
        activeKey={activeMetric}
        onChange={(activeKey) => {
          setActiveMetric(activeKey);
          setActiveSystemExamples(undefined);
        }}
      >
        {metricNames.map((metric, _) => {
          return createMetricPane(
            props,
            metric,
            colSpan,
            exampleTable,
            setActiveSystemExamples,
            setPage
          );
        })}
      </Tabs>
    </div>
  );
}
