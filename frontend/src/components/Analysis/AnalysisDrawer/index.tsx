import { Button, Drawer, Spin, Tooltip, Typography } from "antd";
import { RedoOutlined } from "@ant-design/icons";
import React, { useEffect, useState } from "react";
import { SystemModel } from "../../../models";
import { ErrorBoundary, AnalysisReport } from "../../../components";
import { PageState } from "../../../utils";
import { backendClient } from "../../../clients";
import {
  SystemAnalysesReturn,
  SystemsAnalysesBody,
} from "../../../clients/openapi";
import { getMetricToSystemAnalysesParsed, valuesToIntervals } from "../utils";
import { SystemAnalysisParsed, UIBucketInfo } from "../types";
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
  const [singleAnalyses, setSingleAnalyses] = useState<
    SystemAnalysesReturn["single_analyses"]
  >({});
  const [featureNameToBucketInfo, setFeatureNameToBucketInfo] = useState<{
    [key: string]: UIBucketInfo;
  }>({});
  const [metricToSystemAnalysesParsed, setMetricToSystemAnalysesParsed] =
    useState<{ [key: string]: SystemAnalysisParsed[] }>({});
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
          }, 20000); // 20 seconds
          backendClient
            .systemsAnalysesPost({
              system_ids: activeSystemIDs.join(","),
              // Hardcoded to false. TODO(chihhao) wait for SDK's update
              pairwise_performance_gap: false,
              feature_to_bucket_info: featureNameToBucketInfoToPost,
            })
            .then((systemAnalysesReturn) => {
              clearTimeout(timeoutID);
              resolve(systemAnalysesReturn);
            });
        }).catch(() => {
          return null;
        });
      if (systemAnalysesReturn === null) {
        setPageState(PageState.error);
        return;
      }
      const { single_analyses: singleAnalyses } = systemAnalysesReturn;
      /*
      Take from the first element as the task and type/number of metrics should be 
      invariant across sytems in pairwise analysis
      */
      const firstSystemInfo = activeSystems[0].system_info;
      const task = firstSystemInfo.task_name;

      const metricNames = firstSystemInfo.metric_configs.map(
        (config) => config.name
      );
      const metricToSystemAnalysesParsed = getMetricToSystemAnalysesParsed(
        task,
        metricNames,
        activeSystems,
        singleAnalyses
      );

      const parsedFeatureNameToBucketInfo: { [key: string]: UIBucketInfo } = {};
      // Take from the first element as the bucket interval is invariant across metrics
      const systemAnalysesParsed = Object.values(
        metricToSystemAnalysesParsed
      )[0];
      // Take from the first element as the bucket interval is invariant across systems
      const resultsFineGrainedParsed =
        systemAnalysesParsed[0].resultsFineGrainedParsed;
      for (const resultFineGrainedParsed of resultsFineGrainedParsed) {
        const {
          bucketInfo,
          featureName,
          bucketMin,
          bucketMax,
          bucketRightBounds,
        } = resultFineGrainedParsed;
        /* Hardcode for now as SDK doesn't export the string.
        bucket_attribute_discrete_value seems to be used for categorical features,
        which do not support custom bucket range.
        */
        if (bucketInfo?.method !== "bucket_attribute_discrete_value") {
          parsedFeatureNameToBucketInfo[featureName] = {
            min: bucketMin,
            max: bucketMax,
            // discard the last right bound because it is max
            rightBounds: bucketRightBounds.slice(
              0,
              bucketRightBounds.length - 1
            ),
            /* A bucket may remain updated (i.e. different from the init value of SDK) 
            across multiple post calls, so we must reuse this information from the state
            */
            updated: featureNameToBucketInfo[featureName]?.updated || false,
          };
        }
      }
      setTask(task);
      setSingleAnalyses(singleAnalyses);
      setMetricToSystemAnalysesParsed(metricToSystemAnalysesParsed);
      setFeatureNameToBucketInfo(parsedFeatureNameToBucketInfo);
      setPageState(PageState.success);
      setBucketInfoUpdated(false);
    }

    if (visible && shouldUpdateAnalysis) {
      setShouldUpdateAnalysis(false);
      const featureNameToBucketInfoToPost: SystemsAnalysesBody["feature_to_bucket_info"] =
        {};
      for (const [featureName, bucketInfo] of Object.entries(
        featureNameToBucketInfo
      )) {
        const { min, max, rightBounds, updated } = bucketInfo;
        if (updated) {
          const values = [min, ...rightBounds, max];
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
    bucketInfo: UIBucketInfo
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
    setSingleAnalyses({});
    setFeatureNameToBucketInfo({});
    setBucketInfoUpdated(false);
  }

  let drawerTitle;
  if (activeSystems.length === 1) {
    drawerTitle = `Single Analysis of ${activeSystems[0].system_info.model_name}`;
  } else if (activeSystems.length === 2) {
    const systemNames = activeSystems
      .map((sys) => sys.system_info.model_name)
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
          {visible && Object.keys(singleAnalyses).length > 0 && (
            <AnalysisReport
              task={task}
              systems={activeSystems}
              singleAnalyses={singleAnalyses}
              metricToSystemAnalysesParsed={metricToSystemAnalysesParsed}
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
