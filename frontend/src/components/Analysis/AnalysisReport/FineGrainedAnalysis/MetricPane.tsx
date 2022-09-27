import React, { useState } from "react";
import { message, Row, Spin } from "antd";
import { SystemModel } from "../../../../models";
import { BucketIntervals, ResultFineGrainedParsed } from "../../types";
import { ExampleTable } from "../ExampleTable";
import { FineGrainedBarChart } from "./FineGrainedBarChart";
import { AnalysisCase } from "../../../../clients/openapi";
import { backendClient, parseBackendError } from "../../../../clients";
import { compareBucketOfCases } from "../../utils";
import { PageState } from "../../../../utils";

interface Props {
  task: string;
  systems: SystemModel[];
  featureNameToBucketInfo: { [feature: string]: BucketIntervals };
  updateFeatureNameToBucketInfo: (
    featureName: string,
    bucketInfo: BucketIntervals
  ) => void;
  metricToSystemAnalysesParsed: {
    [metric: string]: { [feature: string]: ResultFineGrainedParsed[] };
  };
  metric: string;
}

/** Info that uniquely identifies a bar in the charts */
export interface BarInfo {
  feature: string;
  barIndex: number;
  systemIndex: number;
}

export function MetricPane(props: Props) {
  const {
    task,
    systems,
    metricToSystemAnalysesParsed,
    metric,
    featureNameToBucketInfo,
    updateFeatureNameToBucketInfo,
  } = props;
  const systemAnalysesParsed = metricToSystemAnalysesParsed[metric];

  const [pageState, setPageState] = useState(PageState.success);
  const [selectedBar, setSelectedBar] = useState<BarInfo>();

  // ExampleTable
  // cases to show for each system; numSystem x numCases
  const [selectedCases, setSelectedCases] = useState<AnalysisCase[][]>([]);

  function generateBarChartTitle(feature: string): string {
    const featureDescription =
      systemAnalysesParsed[feature][0].featureDescription;
    return `${metric} by ${featureDescription}`;
  }

  /** Handles bar click
   * 1. updates selectedBar
   * 2. find associated cases
   * 3. sends requests to get sample IDs for each case
   * 4. update selectedSampleIDs
   */
  async function onBarClick(
    feature: string,
    barIndex: number,
    systemIndex: number
  ) {
    setPageState(PageState.loading);
    setSelectedBar({ feature, barIndex, systemIndex });

    /** select the cases of the chosen bar for all systems*/
    const levelAndCaseIDs = systemAnalysesParsed[feature].map(
      (resultParsed) => ({
        levelName: resultParsed.levelName,
        caseIDs: resultParsed.cases[barIndex],
      })
    );
    try {
      let caseDetails = await Promise.all(
        levelAndCaseIDs.map(({ levelName, caseIDs }, i) =>
          backendClient.systemCasesGetById(
            systems[i].system_id,
            levelName,
            caseIDs
          )
        )
      );
      caseDetails = caseDetails.map((casesForSystem) =>
        casesForSystem.sort(compareBucketOfCases)
      );
      setSelectedCases(caseDetails);
    } catch (e) {
      console.error(e);
      if (e instanceof Response) {
        const error = await parseBackendError(e);
        message.error(error.getErrorMsg());
      }
    } finally {
      setPageState(PageState.success);
    }
  }

  const isLoading = pageState === PageState.loading;

  return (
    <div style={{ cursor: isLoading ? "wait" : "auto" }}>
      <Spin spinning={isLoading}>
        <Row>
          {
            // Map the resultsFineGrainedParsed of the every element in systemAnalysesParsed
            // into columns. One column contains a single BarChart.
            Object.keys(systemAnalysesParsed).map((feature) => (
              <FineGrainedBarChart
                systems={systems}
                featureNameToBucketInfo={featureNameToBucketInfo}
                updateFeatureNameToBucketInfo={updateFeatureNameToBucketInfo}
                title={generateBarChartTitle(feature)}
                results={systemAnalysesParsed[feature]}
                onBarClick={(barIndex, systemIndex) =>
                  onBarClick(feature, barIndex, systemIndex)
                }
                key={feature}
              />
            ))
          }
        </Row>
        {selectedBar && selectedCases.length > 0 && (
          <ExampleTable
            title={`Examples from bar # ${
              selectedBar.barIndex + 1
            } in ${generateBarChartTitle(selectedBar.feature)}`}
            task={task}
            systems={systems}
            cases={selectedCases}
            activeSystemIndex={selectedBar.systemIndex}
            onActiveSystemIndexChange={(newSystemIndex) =>
              setSelectedBar({ ...selectedBar, systemIndex: newSystemIndex })
            }
            changeState={setPageState}
          />
        )}
      </Spin>
    </div>
  );
}
