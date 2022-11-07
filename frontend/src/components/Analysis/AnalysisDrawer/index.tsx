import React, { useCallback, useEffect, useState } from "react";
import { Drawer, Spin, Tooltip } from "antd";
import { SystemModel } from "../../../models";
import { ErrorBoundary, AnalysisReport } from "../../../components";
import { PageState } from "../../../utils";
import { backendClient, parseBackendError } from "../../../clients";
import {
  SystemAnalysesReturn,
  SystemsAnalysesBody,
} from "../../../clients/openapi";
import { WarningOutlined } from "@ant-design/icons";
import { parseFineGrainedResults, valuesToIntervals } from "../utils";
import { ResultFineGrainedParsed, BucketIntervals } from "../types";
import ReactGA from "react-ga4";
import { AnalysisButton } from "./AnalysisButton";
import { FallbackUI } from "./FallbackUI";
import { DownloadAnalysisButton } from "./DownloadAnalysisButton";
import JSZip from "jszip";
import fileSaver from "file-saver";

interface Props {
  /** systems to display */
  systems: SystemModel[];
  closeDrawer: () => void;
}

export function AnalysisDrawer({ systems, closeDrawer }: Props) {
  const visible = systems.length > 0;
  const [shouldUpdateAnalysis, setShouldUpdateAnalysis] = useState(true);
  const [pageState, setPageState] = useState(PageState.loading);
  const [errorMessage, setErrorMessage] = useState("");
  const [systemAnalysesReturn, setSystemAnalysesReturn] =
    useState<SystemAnalysesReturn>();

  const [featureNameToBucketInfo, setFeatureNameToBucketInfo] = useState<{
    [key: string]: BucketIntervals;
  }>({});
  const [metricToAnalyses, setMetricToAnalyses] = useState<{
    [metric: string]: { [feature: string]: ResultFineGrainedParsed[] };
  }>({});
  const [bucketInfoUpdated, setBucketInfoUpdated] = useState<boolean>(false);
  const [chartFiles, setCharFiles] = useState<{
    [imgName: string]: string;
  }>({});

  /**
   * Derive task from the first system. If multiple systems are selected,
   * they are assumed to be of the same task type.
   * @throws if systems is an empty list
   */
  const getTask = useCallback(() => {
    if (systems.length === 0)
      throw new Error("systems is empty. cannot determine task.");
    return systems[0].task;
  }, [systems]);

  useEffect(() => {
    async function refreshAnalyses(
      featureNameToBucketInfoToPost: SystemsAnalysesBody["feature_to_bucket_info"]
    ) {
      setPageState(PageState.loading);

      // request times out in 40s
      const timeoutController = new AbortController();
      const timeoutID = setTimeout(() => timeoutController.abort(), 40000);
      try {
        const newSystemAnalysesReturn = await backendClient.systemsAnalysesPost(
          {
            system_ids: systems.map((sys) => sys.system_id).join(","),
            feature_to_bucket_info: featureNameToBucketInfoToPost,
          },
          { signal: timeoutController.signal }
        );
        clearTimeout(timeoutID);
        const { system_analyses: systemAnalyses } = newSystemAnalysesReturn;

        const newMetricToAnalyses = parseFineGrainedResults(systemAnalyses);

        const newFeatureNameToBucketInfo: { [key: string]: BucketIntervals } =
          {};
        for (const systemAnalysesParsed of Object.values(newMetricToAnalyses)) {
          for (const feature of Object.keys(systemAnalysesParsed)) {
            // No need to repeat the process for multiple metrics if it's already found
            if (feature in newFeatureNameToBucketInfo) {
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
              newFeatureNameToBucketInfo[featureName] = {
                min: bucketIntervals.min,
                max: bucketIntervals.max,
                bounds: bucketIntervals.bounds.slice(
                  0,
                  bucketIntervals.bounds.length - 1
                ),
                updated:
                  newFeatureNameToBucketInfo[featureName]?.updated || false,
              };
            }
          }
        }
        setSystemAnalysesReturn(newSystemAnalysesReturn);
        setMetricToAnalyses(newMetricToAnalyses);
        setFeatureNameToBucketInfo(newFeatureNameToBucketInfo);
        setPageState(PageState.success);
        setErrorMessage("");
        setBucketInfoUpdated(false);
      } catch (e) {
        setPageState(PageState.error);
        if (timeoutController.signal.aborted) {
          setErrorMessage(
            "Analysis takes too long to complete. Please try again later or report a bug."
          );
        } else if (e instanceof Response) {
          const backendError = await parseBackendError(e);
          setErrorMessage(backendError.getErrorMsg());
        }
        console.error(e);
      }
    }

    function sendGA() {
      if (systems.length === 1) {
        ReactGA.event({
          category: "Analysis",
          action: `analysis_single`,
          label: getTask(),
        });
      } else {
        ReactGA.event({
          category: "Analysis",
          action: `analysis_multi`,
          label: getTask(),
        });
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
      sendGA();
    }
  }, [
    visible,
    shouldUpdateAnalysis,
    systems,
    featureNameToBucketInfo,
    getTask,
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
    // set to true so analysis is performed next time when drawer is opened
    setCharFiles({});
    setShouldUpdateAnalysis(true);
    closeDrawer();
    setSystemAnalysesReturn(undefined);
    setPageState(PageState.loading);
    setFeatureNameToBucketInfo({});
    setBucketInfoUpdated(false);
  }

  function getDrawerTitle(): React.ReactNode {
    const systemNames = systems.map((sys) => sys.system_name);
    const distinctSystemNames = new Set(systemNames);
    const duplicateNameWarning =
      distinctSystemNames.size !== systemNames.length;
    const duplicateNameWarningMsg =
      "The systems have duplicate names. Unique system IDs are attached to distinguish between them. Please change system names using the edit button on `Systems` page.";
    if (systems.length === 1) {
      return `Single Analysis of ${systems[0].system_name}`;
    } else if (systems.length === 2) {
      const systemNames = systems.map((sys) => sys.system_name).join(" and ");
      return (
        <div>
          Pairwise Analysis of {systemNames}{" "}
          {duplicateNameWarning && (
            <Tooltip title={duplicateNameWarningMsg}>
              <WarningOutlined />
            </Tooltip>
          )}
        </div>
      );
    }
    return (
      <div>
        Analysis{" "}
        {duplicateNameWarning && (
          <Tooltip title={duplicateNameWarningMsg}>
            <WarningOutlined />
          </Tooltip>
        )}
      </div>
    );
  }

  function addChartFile(imgName: string, base64File: string) {
    const tmp = chartFiles;
    tmp[imgName] = base64File;
    setCharFiles(tmp);
  }

  function renderDrawerContent(): React.ReactElement {
    if (visible && systemAnalysesReturn) {
      return (
        <AnalysisReport
          task={getTask()}
          systems={systems}
          systemAnalyses={systemAnalysesReturn.system_analyses}
          significanceTestInfo={systemAnalysesReturn.significance_test_info}
          metricToSystemAnalysesParsed={metricToAnalyses}
          featureNameToBucketInfo={featureNameToBucketInfo}
          updateFeatureNameToBucketInfo={updateFeatureNameToBucketInfo}
          addChartFile={addChartFile}
        />
      );
    }
    if (pageState === PageState.error)
      return <FallbackUI errorMessage={errorMessage} />;
    return <div style={{ height: "50vh" }} />;
  }

  function downloadAnalysis() {
    const zip = new JSZip();
    const zipFileName =
      "ExplainaBoard_Analysis_" +
      systems.map((sys) => sys.system_name).join("_") +
      ".zip";
    for (const fileName of Object.keys(chartFiles)) {
      zip.file(fileName + ".png", chartFiles[fileName].split("base64,")[1], {
        base64: true,
      });
    }
    zip.generateAsync({ type: "blob" }).then(function (content: Blob) {
      fileSaver.saveAs(content, zipFileName);
    });
  }

  return (
    <Drawer
      visible={visible}
      onClose={() => closeSystemAnalysis()}
      title={getDrawerTitle()}
      width="90%"
      bodyStyle={{ minWidth: "800px" }}
      /*Mark the drawer unclosable when the page is still loading to prevent
        users from exiting before the asycn function finishes.
      */
      closable={pageState !== PageState.loading}
      maskClosable={pageState !== PageState.loading}
      extra={
        <div>
          <DownloadAnalysisButton
            disabled={pageState === PageState.loading}
            onClick={() => downloadAnalysis()}
          />{" "}
          <AnalysisButton
            disabled={!bucketInfoUpdated}
            onClick={() => setShouldUpdateAnalysis(true)}
          />
        </div>
      }
    >
      {/* The analysis report is expected to fail if a user selects systems with different datasets.
        We use an error boundary component and provide a fall back UI if an error is caught.
      */}
      <ErrorBoundary fallbackUI={<FallbackUI errorMessage={errorMessage} />}>
        <Spin spinning={pageState === PageState.loading} tip="Analyzing...">
          {renderDrawerContent()}
        </Spin>
      </ErrorBoundary>
    </Drawer>
  );
}
