import { Button, Drawer, Spin, Tooltip, Typography } from "antd";
import { RedoOutlined } from "@ant-design/icons";
import React, { useEffect, useState } from "react";
import { SystemModel } from "../../../models";
import { ErrorBoundary, AnalysisReport } from "../../../components";
import { PageState } from "../../../utils";
import { backendClient } from "../../../clients";
import {
  SingleAnalysis,
  SystemAnalysesReturn,
  SystemsAnalysesBody,
} from "../../../clients/openapi/api";
import { parseFineGrainedResults, valuesToIntervals } from "../utils";
import { ResultFineGrainedParsed, BucketIntervals } from "../types";
import ReactGA from "react-ga4";
const { Text, Link } = Typography;

interface Props {
  visible: boolean;
  systems: SystemModel[];
  activeSystemIDs: string[];
  setActiveSystemIDs: React.Dispatch<React.SetStateAction<string[]>>;
}

export function AnalysisDrawer({
  visible,
  systems,
  activeSystemIDs,
  setActiveSystemIDs,
}: Props) {
  const [shouldUpdateAnalysis, setShouldUpdateAnalysis] =
    useState<boolean>(true);
  const [pageState, setPageState] = useState(PageState.loading);
  const [task, setTask] = useState<string>("");
  const [systemAnalyses, setSystemAnalyses] = useState<
    SystemAnalysesReturn["system_analyses"]
  >(Array<SingleAnalysis>());
  const [featureNameToBucketInfo, setFeatureNameToBucketInfo] = useState<{
    [key: string]: BucketIntervals;
  }>({});
  const [metricToAnalyses, setMetricToAnalyses] = useState<{
    [metric: string]: { [feature: string]: ResultFineGrainedParsed[] };
  }>({});
  const [bucketInfoUpdated, setBucketInfoUpdated] = useState<boolean>(false);

  const activeSystems = systems.filter((sys) =>
    activeSystemIDs.includes(sys.system_id)
  );

  useEffect(() => {
    async function refreshAnalyses(
      featureNameToBucketInfoToPost: SystemsAnalysesBody["feature_to_bucket_info"]
    ) {
      setPageState(PageState.loading);
      const systemAnalysesReturn: SystemAnalysesReturn | null =
        await new Promise<SystemAnalysesReturn>((resolve, reject) => {
          const timeoutID = setTimeout(() => {
            reject(new Error("timeout"));
          }, 40000); // 40 seconds
          backendClient
            .systemsAnalysesPost({
              system_ids: activeSystemIDs.join(","),
              feature_to_bucket_info: featureNameToBucketInfoToPost,
            })
            .then(
              (
                singleAnalysis:
                  | SystemAnalysesReturn
                  | PromiseLike<SystemAnalysesReturn>
              ) => {
                clearTimeout(timeoutID);
                resolve(singleAnalysis);
              }
            );
        }).catch(() => {
          return null;
        });
      if (systemAnalysesReturn === null) {
        setPageState(PageState.error);
        return;
      }
      const { system_analyses: systemAnalyses } = systemAnalysesReturn;
      /*
      Take from the first element as the task and type/number of metrics should be 
      invariant across sytems in pairwise analysis
      */
      const firstSystemInfo = activeSystems[0].system_info;
      const task = firstSystemInfo.task_name;

      const metricToAnalyses = parseFineGrainedResults(
        task,
        activeSystems,
        systemAnalyses
      );

      const featureNameToBucketInfo: { [key: string]: BucketIntervals } = {};
      for (const systemAnalysesParsed of Object.values(metricToAnalyses)) {
        for (const feature of Object.keys(systemAnalysesParsed)) {
          // No need to repeat the process for multiple metrics if it's already found
          if (feature in featureNameToBucketInfo) {
            continue;
          }
          // Take from the first element as the bucket interval is system-invariant
          const resultFineGrainedParsed = systemAnalysesParsed[feature][0];
          const { featureName, bucketIntervals, bucketType } =
            resultFineGrainedParsed;
          /* Hardcode for now as SDK doesn't export the string.
          bucket_attribute_discrete_value seems to be used for categorical features,
          which do not support custom bucket range.
          */
          if (bucketType !== "discrete") {
            featureNameToBucketInfo[featureName] = {
              min: bucketIntervals.min,
              max: bucketIntervals.max,
              bounds: bucketIntervals.bounds.slice(
                0,
                bucketIntervals.bounds.length - 1
              ),
              updated: featureNameToBucketInfo[featureName]?.updated || false,
            };
          }
        }
        setTask(task);
        setSystemAnalyses(systemAnalyses);
        setMetricToAnalyses(metricToAnalyses);
        setFeatureNameToBucketInfo(featureNameToBucketInfo);
        setPageState(PageState.success);
        setBucketInfoUpdated(false);
        if (activeSystems.length === 1) {
          ReactGA.event({
            category: "Analysis",
            action: `analysis_single`,
            label: task,
          });
        } else {
          ReactGA.event({
            category: "Analysis",
            action: `analysis_multi`,
            label: task,
          });
        }
      }
    }

    if (visible && shouldUpdateAnalysis) {
      setShouldUpdateAnalysis(false);
      const featureNameToBucketInfoToPost: SystemsAnalysesBody["feature_to_bucket_info"] =
        {};
      for (const [featureName, bucketInfo] of Object.entries(
        featureNameToBucketInfo
      )) {
        const { min, max, bounds, updated } = bucketInfo;
        if (updated) {
          const values = [min, ...bounds, max];
          // Default uses alphabetic sorting. Must supply a custom sort function
          values.sort(function (a, b) {
            return a - b;
          });
          const intervals = valuesToIntervals(values);
          featureNameToBucketInfoToPost[featureName] = {
            number: intervals.length,
            setting: intervals,
          };
        }
      }
      refreshAnalyses(featureNameToBucketInfoToPost);
    }
  }, [
    visible,
    shouldUpdateAnalysis,
    activeSystemIDs,
    activeSystems,
    featureNameToBucketInfo,
  ]);

  function updateFeatureNameToBucketInfo(
    featureName: string,
    bucketInfo: BucketIntervals
  ) {
    const updatedBucketInfo = {
      ...bucketInfo,
      updated: true,
    };
    setFeatureNameToBucketInfo((prevFeatureNameToBucketInfo) => {
      return {
        ...prevFeatureNameToBucketInfo,
        [featureName]: updatedBucketInfo,
      };
    });
    setBucketInfoUpdated(true);
  }

  function closeSystemAnalysis() {
    /* set to true so analysis is performed next time
     when drawer is opened
    */
    setShouldUpdateAnalysis(true);
    setActiveSystemIDs([]);
    setPageState(PageState.loading);
    setSystemAnalyses(Array<SingleAnalysis>());
    setFeatureNameToBucketInfo({});
    setBucketInfoUpdated(false);
  }

  let drawerTitle;
  if (activeSystems.length === 1) {
    drawerTitle = `Single Analysis of ${
      activeSystems[0].system_info.system_name
    }, Detailed Info: ${JSON.stringify(
      activeSystems[0].system_info.system_details
    )}`;
  } else if (activeSystems.length === 2) {
    const systemNames = activeSystems
      .map((sys) => sys.system_info.system_name)
      .join(" and ");
    drawerTitle = `Pairwise Analysis of ${systemNames}`;
  }

  const analysisButton = (
    <Tooltip
      title={
        <div>
          Adding, removing, or changing the right bounds of any graph enables
          this button. Click it to update the analysis results.
        </div>
      }
      placement="bottom"
      color="white"
      overlayInnerStyle={{ color: "black" }}
    >
      <Button
        icon={<RedoOutlined />}
        type="primary"
        disabled={!bucketInfoUpdated}
        onClick={() => setShouldUpdateAnalysis(true)}
      >
        Update analysis
      </Button>
    </Tooltip>
  );

  function fallbackUI(errorType: string) {
    return (
      <Text>
        An error (type: {errorType}) occured in the analysis. If you are doing a
        pair-wise analysis, double check if the selected systems use the same
        dataset. If you found a bug, kindly open an issue on{" "}
        <Link
          href="https://github.com/neulab/explainaboard_web"
          target="_blank"
        >
          our GitHub repo
        </Link>
        . Thanks!
      </Text>
    );
  }

  return (
    <Drawer
      visible={visible}
      onClose={() => closeSystemAnalysis()}
      title={drawerTitle}
      width="90%"
      bodyStyle={{ minWidth: "800px" }}
      /*Mark the drawer unclosable when the page is still loading to prevent 
        users from exiting before the asycn function finishes.
      */
      closable={pageState !== PageState.loading}
      maskClosable={pageState !== PageState.loading}
      extra={analysisButton}
    >
      {/* The analysis report is expected to fail if a user selects systems with different datsets.
        We use an error boundary component and provide a fall back UI if an error is caught.
  */}
      <ErrorBoundary fallbackUI={fallbackUI("unknown")}>
        <Spin spinning={pageState === PageState.loading} tip="Analyzing...">
          {visible && Object.keys(systemAnalyses).length > 0 && (
            <AnalysisReport
              task={task}
              systems={activeSystems}
              systemAnalyses={systemAnalyses}
              metricToSystemAnalysesParsed={metricToAnalyses}
              featureNameToBucketInfo={featureNameToBucketInfo}
              updateFeatureNameToBucketInfo={updateFeatureNameToBucketInfo}
            />
          )}
          {pageState === PageState.error && fallbackUI("timeout")}
        </Spin>
      </ErrorBoundary>
    </Drawer>
  );
}
