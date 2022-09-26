import React, { useState } from "react";
import {
  ActiveSystemExamples,
  ResultFineGrainedParsed,
  BucketIntervals,
} from "../types";
import { compareBucketOfCases, unwrapConfidence } from "../utils";
import { Row, Col, Typography, Space, Tabs } from "antd";
import { SystemModel } from "../../../models";
import { SystemAnalysesReturn } from "../../../clients/openapi/api";
import { BucketSlider } from "../BucketSlider";
import { backendClient } from "../../../clients";
import { OverallMetricsBarChart } from "./OverallMetricsBarChart";
import { SignificanceTestList } from "./SignificanceTestList";
import { AnalysisPanel } from "./AnalysisPanel";
import { ConfusionMatrix, AnalysisTable, BarChart } from "../../../components";

const { Title } = Typography;
const { TabPane } = Tabs;

interface Props {
  task: string;
  systems: SystemModel[];
  systemAnalyses: SystemAnalysesReturn["system_analyses"];
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

function createConfusionMatrix(
  props: Props,
  colSpan: number,
  setActiveSystemExamples: React.Dispatch<
    React.SetStateAction<ActiveSystemExamples | undefined>
  >,
  resetPage: () => void
) {
  const { systems, systemAnalyses } = props;

  // For now we only support combo analysis for single-system analysis.
  if (systemAnalyses.length !== 1) {
    return <></>;
  }

  const system = systems[0];
  const analysis = systemAnalyses[0];
  for (const result of analysis.analysis_results) {
    if (result.cls_name === "ComboCountAnalysisResult") {
      const counts = result.combo_counts;

      // Gather all categories and assign index to each of them
      const cateMap = new Map<string, number>();
      const categories = [];
      let idx = 0;
      for (const c of counts) {
        for (const cateString of c[0]) {
          if (!cateMap.has(cateString)) {
            cateMap.set(cateString, idx);
            categories.push(cateString);
            idx++;
          }
        }
      }

      // Parse analysis results to confusion matrix entry data
      const samples: number[][] = [];
      const data: number[][] = [];
      for (const count of counts) {
        // count[0] is a string array of results, i.e., [true label, predicted label]
        const trueLabel: string = count[0][0];
        const predicted: string = count[0][1];
        // count[1] is the number of samples
        const nSamples = count[1];
        data.push([cateMap.get(trueLabel), cateMap.get(predicted), nSamples]);
        // count[2] is a list of samples
        if (count.length > 2) {
          samples.push(count[2]);
        }
      }

      return (
        <Col span={colSpan}>
          <ConfusionMatrix
            title="Confusion Matrix"
            axesTitles={result.features}
            categories={categories}
            entryData={data}
            onEntryClick={async (barIndex: number, systemIndex: number) => {
              if (barIndex < samples.length) {
                // We have a list of samples for this combo
                const bucketOfCasesList =
                  await backendClient.systemCasesGetById(
                    system.system_id,
                    "example",
                    samples[barIndex]
                  );

                setActiveSystemExamples({
                  title: `Samples for trueLabel=${data[barIndex][0]} and predicted=${data[barIndex][1]}`,
                  barIndex,
                  systemIndex,
                  bucketOfCasesList: [bucketOfCasesList],
                });
              }

              // reset page number
              resetPage();
            }}
          />
        </Col>
      );
    }
  }
  return <></>;
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
  const { title, barIndex, systemIndex, bucketOfCasesList } =
    activeSystemExamples;

  // Sort bucket of samples for every system
  const sortedBucketOfCasesList = bucketOfCasesList.map((bucketOfCases) => {
    return bucketOfCases.sort(compareBucketOfCases);
  });

  // single analysis
  if (systems.length === 1) {
    exampleTable = (
      <AnalysisTable
        systemID={systems[0].system_id}
        task={task}
        cases={sortedBucketOfCasesList[0]}
        page={page}
        onPageChange={setPage}
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
                  cases={sortedBucketOfCasesList[sysIndex]}
                  page={page}
                  onPageChange={setPage}
                />
              </TabPane>
            );
          })}
        </Tabs>
      </Space>
    );
  }

  const barText = systems.length === 1 ? "bar" : "bars";
  const exampleText = "Examples";
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
  resetPage: () => void
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
  const resultsBucketsOfSamples: Array<[string, number[]]>[] = [];
  for (const result of results) {
    resultsNumbersOfSamples.push(result.numbersOfSamples);
    resultsBucketsOfSamples.push(
      result.cases.map((myCases) => [result.levelName, myCases])
    );
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
        onBarClick={async (barIndex: number, systemIndex: number) => {
          // Get examples of a certain bucket from all systems
          const bucketOfSamplesList = resultsBucketsOfSamples.map(
            (bucketsOfSamples) => {
              return bucketsOfSamples[barIndex];
            }
          );
          const bucketOfCasesPromiseList = bucketOfSamplesList.map(
            (bucketOfSamples, i) => {
              return backendClient.systemCasesGetById(
                systems[i].system_id,
                bucketOfSamples[0],
                bucketOfSamples[1]
              );
            }
          );
          const bucketOfCasesList = await Promise.all(bucketOfCasesPromiseList);
          setActiveSystemExamples({
            title,
            barIndex,
            systemIndex,
            bucketOfCasesList,
          });
          resetPage();
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
  resetPage: () => void
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
          // into columns. One column contains a single fine grained chart.
          Object.keys(systemAnalysesParsed).map((feature) => {
            if (feature.toLowerCase().startsWith("combo")) {
              if (
                systemAnalysesParsed[feature][0].featureDescription ===
                "confusion matrix"
              ) {
                return createConfusionMatrix(
                  props,
                  colSpan,
                  setActiveSystemExamples,
                  resetPage
                );
              }
            }
            return createFineGrainedBarChart(
              props,
              metric,
              feature,
              systemAnalysesParsed[feature],
              colSpan,
              setActiveSystemExamples,
              resetPage
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

  // page number of the analysis table, 0 indexed
  const [page, setPage] = useState(0);

  /** sets page of AnalysisTable to the first page */
  function resetPage() {
    setPage(0);
  }

  // Create the example table if a bar is selected, empty element if not
  const exampleTable = createExampleTable(
    props,
    activeSystemExamples,
    setActiveSystemExamples,
    page,
    setPage
  );

  const colSpan = getColSpan(props);
  return (
    <div>
      <OverallMetricsBarChart
        systems={props.systems}
        metricNames={Object.keys(metricToSystemAnalysesParsed)}
        onBarClick={(metricName) => setActiveMetric(metricName)}
      />

      {props.significanceTestInfo && (
        <SignificanceTestList
          significanceTestInfo={props.significanceTestInfo}
        />
      )}

      <AnalysisPanel title="Fine-grained Performance">
        <Typography.Paragraph>
          Click a bar to see detailed cases of the system output at the bottom
          of the page.
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
              resetPage
            );
          })}
        </Tabs>
      </AnalysisPanel>
    </div>
  );
}
