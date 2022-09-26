import React, { useState } from "react";
import {
  ActiveSystemExamples,
  ResultFineGrainedParsed,
  BucketIntervals,
} from "../types";
import { compareBucketOfCases } from "../utils";
import { AnalysisTable } from "../../../components";
import { Typography, Space, Tabs } from "antd";
import { SystemModel } from "../../../models";
import { SystemAnalysesReturn } from "../../../clients/openapi/api";
import { OverallMetricsBarChart } from "./OverallMetricsBarChart";
import { SignificanceTestList } from "./SignificanceTestList";
import { AnalysisPanel } from "./AnalysisPanel";
import { MetricPane } from "./FineGrainedAnalysis/MetricPane";

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
          {metricNames.map((metric) => (
            <Tabs.TabPane tab={metric} key={metric}>
              <MetricPane
                systems={props.systems}
                featureNameToBucketInfo={props.featureNameToBucketInfo}
                updateFeatureNameToBucketInfo={
                  props.updateFeatureNameToBucketInfo
                }
                metricToSystemAnalysesParsed={
                  props.metricToSystemAnalysesParsed
                }
                metric={metric}
                colSpan={colSpan}
                exampleTable={exampleTable}
                setActiveSystemExamples={setActiveSystemExamples}
                resetPage={resetPage}
              />
            </Tabs.TabPane>
          ))}
        </Tabs>
      </AnalysisPanel>
    </div>
  );
}
