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
import { FineGrainedAnalysis } from "./FineGrainedAnalysis";

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

      <FineGrainedAnalysis
        systems={props.systems}
        featureNameToBucketInfo={props.featureNameToBucketInfo}
        updateFeatureNameToBucketInfo={props.updateFeatureNameToBucketInfo}
        metricToSystemAnalysesParsed={props.metricToSystemAnalysesParsed}
        exampleTable={exampleTable}
        setActiveSystemExamples={setActiveSystemExamples}
        resetPage={resetPage}
        activeMetric={activeMetric}
        onActiveMetricChange={(newMetricName) => {
          setActiveMetric(newMetricName);
          setActiveSystemExamples(undefined);
        }}
        metricNames={metricNames}
      />
    </div>
  );
}
