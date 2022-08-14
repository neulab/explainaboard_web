import React, { useState } from "react";
import {
  ActiveSystemExamples,
  ResultFineGrainedParsed,
  BucketIntervals,
} from "../types";
import { compareBucketOfSamples } from "../utils";
import { BarChart, AnalysisTable } from "../../../components";
import { Row, Col, Typography, Space, Tabs, List, Avatar } from "antd";
import { SystemModel } from "../../../models";
import {
  BucketCase,
  SystemAnalysesReturn,
  Performance,
} from "../../../clients/openapi";
import { BucketSlider } from "../BucketSlider";

const { Title } = Typography;
const { TabPane } = Tabs;

interface Props {
  task: string;
  systems: SystemModel[];
  singleAnalyses: SystemAnalysesReturn["single_analyses"];
  significanceTestInfo: SystemAnalysesReturn["significance_test_info"];
  metricToSystemAnalysesParsed: {
    [metric: string]: { [feature: string]: ResultFineGrainedParsed[] };
  };
  featureNameToBucketInfo: { [feature: string]: BucketIntervals };
  updateFeatureNameToBucketInfo: (
    featureName: string,
    bucketInfo: BucketIntervals
  ) => void;
}

function getColSpan(props: Props) {
  /* The visualization chart of a fine-grained result is displayed using the "Grid" layout by Ant Design.
  Specifically, all charts are enclosed by <Col></Col>, which are then enclosed by a single <Row></Row>.
  Ant design takes care of overflow and auto starts a new line.
  */
  // Get the size of the column span
  const { systems, featureNameToBucketInfo } = props;

  // Get the maximum right bound length
  const maxRightBoundsLength = Math.max(
    ...Object.values(featureNameToBucketInfo).map(
      (bucketInfo) => bucketInfo.bounds.length
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

function unwrapConfidence(perf: Performance) {
  let conf: [number, number] = [-1, -1];
  if (
    perf.confidence_score_low !== undefined &&
    perf.confidence_score_high !== undefined
  ) {
    conf = [perf.confidence_score_low, perf.confidence_score_high];
  }
  return conf;
}

function createOverallBarChart(
  props: Props,
  colSpan: number,
  setActiveMetric: React.Dispatch<React.SetStateAction<string>>,
  setActiveSystemExamples: React.Dispatch<
    React.SetStateAction<ActiveSystemExamples | undefined>
  >,
  setPage: React.Dispatch<React.SetStateAction<number>>
) {
  const { systems, metricToSystemAnalysesParsed } = props;
  // TODO(gneubig): make this setting global somewhere
  const systemNames = systems.map((system) => system.system_info.system_name);
  const metricNames = Object.keys(metricToSystemAnalysesParsed);

  const resultsValues: number[][] = [];
  const resultsNumbersOfSamples: number[][] = [];
  const resultsConfidenceScores: Array<[number, number]>[] = [];
  // The metric names that exist in overall results
  const activeMetricNames: string[] = Object.keys(
    systems[0].system_info.results.overall
  );
  for (const system of systems) {
    const overallResults = system.system_info.results.overall;
    const metricPerformance = [];
    const metricConfidence = [];
    const metricNumberOfSamples = [];
    for (const metricName of activeMetricNames) {
      if (metricName in overallResults) {
        const metricResults = overallResults[metricName];
        metricPerformance.push(metricResults.value);
        metricConfidence.push(unwrapConfidence(metricResults));
      } else {
        metricPerformance.push(0);
        const noConfidence: [number, number] = [-1, -1];
        metricConfidence.push(noConfidence);
      }
      // TODO(gneubig): How can we get the dataset size?
      metricNumberOfSamples.push(-1);
    }
    resultsValues.push(metricPerformance);
    resultsConfidenceScores.push(metricConfidence);
    resultsNumbersOfSamples.push(metricNumberOfSamples);
  }

  return (
    <Col span={colSpan}>
      <BarChart
        title="Overall Performance"
        seriesNames={systemNames}
        xAxisData={activeMetricNames}
        seriesDataList={resultsValues}
        seriesLabelsList={resultsValues}
        confidenceScoresList={resultsConfidenceScores}
        numbersOfSamplesList={resultsNumbersOfSamples}
        onBarClick={(barIndex: number, _: number) => {
          // Get examples of a certain bucket from all systems
          setActiveMetric(metricNames[barIndex]);
          // reset page number
          setPage(0);
        }}
      />
    </Col>
  );
}

function getSignificanceTestScore(props: Props) {
  const { significanceTestInfo } = props;

  const sig_infos = [];
  for (const value in significanceTestInfo) {
    sig_infos.push({
      metric_name: value,
      description: significanceTestInfo[value]["description"],
    });
  }

  if (sig_infos.length !== 0) {
    return (
      <Typography.Title level={4}>
        <Typography.Title level={4}>Significance Test </Typography.Title>
        <Typography.Title level={4}> </Typography.Title>
        <List
          itemLayout="horizontal"
          dataSource={sig_infos}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Avatar src="https://explainaboard.s3.amazonaws.com/logo/task.png" />
                }
                title={
                  <a href="https://github.com/neulab/ExplainaBoard/tree/main/explainaboard/metrics">
                    {item.metric_name}
                  </a>
                }
                description={item.description}
              />
            </List.Item>
          )}
        />
      </Typography.Title>
    );
  }
}

function createExampleTable(
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
  const { title, barIndex, systemIndex, bucketOfSamplesList } =
    activeSystemExamples;

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
        page={page}
        setPage={setPage}
      />
    );
    // multi-system analysis
  } else {
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
              <TabPane tab={system.system_info.system_name} key={`${sysIndex}`}>
                <AnalysisTable
                  systemID={system.system_id}
                  task={task}
                  outputIDs={sortedBucketOfSamplesList[sysIndex]}
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

function createFineGrainedBarChart(
  props: Props,
  metric: string,
  feature: string,
  results: ResultFineGrainedParsed[],
  colSpan: number,
  setActiveSystemExamples: React.Dispatch<
    React.SetStateAction<ActiveSystemExamples | undefined>
  >,
  setPage: React.Dispatch<React.SetStateAction<number>>
) {
  const { systems, featureNameToBucketInfo, updateFeatureNameToBucketInfo } =
    props;
  // For invariant variables across all systems, we can simply take from the first result
  const systemNames = systems.map((system) => system.system_info.system_name);
  const resultFirst = results[0];
  const title = `${metric} by ${resultFirst.featureDescription}`;
  const bucketNames = resultFirst.bucketNames;
  const featureName = resultFirst.featureName;
  let bucketSlider = null;
  if (featureName in featureNameToBucketInfo) {
    const bucketInfo = featureNameToBucketInfo[featureName];
    const bucketRightBounds = bucketInfo.bounds;
    if (bucketRightBounds !== undefined) {
      const bucketMin = bucketInfo.min;
      const bucketMax = bucketInfo.max;
      const bucketStep = bucketMax - bucketMin <= 1.0 ? 0.01 : 1;
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
          onChange={(bounds) => {
            updateFeatureNameToBucketInfo(featureName, {
              min: bucketMin,
              max: bucketMax,
              bounds: bounds,
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
  for (const result of results) {
    resultsNumbersOfSamples.push(result.numbersOfSamples);
    resultsBucketsOfSamples.push(result.cases);
    resultsValues.push(result.performances.map((perf) => perf.value));
    resultsConfidenceScores.push(
      result.performances.map((perf) => unwrapConfidence(perf))
    );
  }

  return (
    <Col span={colSpan} key={resultFirst.featureDescription}>
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
            bucketOfSamplesList,
          });
          // reset page number
          setPage(0);
        }}
      />
      {bucketSlider}
    </Col>
  );
}

function createMetricPane(
  props: Props,
  metric: string,
  colSpan: number,
  exampleTable: JSX.Element,
  setActiveSystemExamples: React.Dispatch<
    React.SetStateAction<ActiveSystemExamples | undefined>
  >,
  setPage: React.Dispatch<React.SetStateAction<number>>
) {
  const systemAnalysesParsed = props.metricToSystemAnalysesParsed[metric];

  /*Get the parsed result from the first system for mapping.
  FeatureNames and descriptions are invariant information
  */
  return (
    <TabPane tab={metric} key={metric}>
      <Row>
        {
          // Map the resultsFineGrainedParsed of the every element in systemAnalysesParsed
          // into columns. One column contains a single BarChart.
          Object.keys(systemAnalysesParsed).map((feature) =>
            createFineGrainedBarChart(
              props,
              metric,
              feature,
              systemAnalysesParsed[feature],
              colSpan,
              setActiveSystemExamples,
              setPage
            )
          )
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
  const significanceInfo = getSignificanceTestScore(props);
  return (
    <div>
      {overallBarChart}

      {significanceInfo}

      <Typography.Title level={4}>Fine-grained Performance</Typography.Title>

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
