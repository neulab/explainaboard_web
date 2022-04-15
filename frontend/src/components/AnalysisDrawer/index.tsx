import { Drawer, Spin, Typography } from "antd";
import React, { useEffect, useState } from "react";
import { SystemModel } from "../../models";
import { ErrorBoundary, AnalysisReport } from "../../components";
import { PageState } from "../../utils";
import { backendClient } from "../../clients";
import { SystemAnalysesReturn } from "../../clients/openapi";
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
  const [pageState, setPageState] = useState(PageState.loading);
  const [singleAnalyses, setSingleAnalyses] = useState<
    SystemAnalysesReturn["single_analyses"]
  >({});
  useEffect(() => {
    async function refreshAnalyses() {
      setPageState(PageState.loading);
      // Hardcoded to false. TODO(chihhao) wait for SDK's update
      const getPairwisePerformanceGap = "false";
      const { single_analyses: singleAnalyses } =
        await backendClient.systemsAnalysesGet(
          activeSystemIDs.join(","),
          getPairwisePerformanceGap
        );
      setSingleAnalyses(singleAnalyses);
      setPageState(PageState.success);
    }
    if (visible) {
      refreshAnalyses();
    }
  }, [visible, activeSystemIDs]);

  function closeSystemAnalysis() {
    setActiveSystemIDs([]);
    setPageState(PageState.loading);
    setSingleAnalyses({});
  }

  const activeSystems = systems.filter((sys) =>
    activeSystemIDs.includes(sys.system_id)
  );

  let drawerTitle;
  if (activeSystems.length === 1) {
    drawerTitle = `Single Analysis of ${activeSystems[0].system_info.model_name}`;
  } else if (activeSystems.length === 2) {
    const systemNames = activeSystems
      .map((sys) => sys.system_info.model_name)
      .join(" and ");
    drawerTitle = `Pairwise Analysis of ${systemNames}`;
  }

  return (
    <Drawer
      visible={visible}
      onClose={() => closeSystemAnalysis()}
      title={drawerTitle}
      width="90%"
      bodyStyle={{ minWidth: "800px" }}
    >
      {/* The analysis report is expected to fail if a user selects systems with different datsets.
        We use an error boundary component and provide a fall back UI if an error is caught.
  */}
      <ErrorBoundary
        fallbackUI={
          <Text>
            An error occured in the analysis. Double check if the selected
            systems use the same dataset. If you found a bug, kindly open an
            issue on{" "}
            <Link
              href="https://github.com/neulab/explainaboard_web"
              target="_blank"
            >
              our GitHub repo
            </Link>
            . Thanks!
          </Text>
        }
      >
        <Spin spinning={pageState === PageState.loading} tip="Analyzing...">
          {visible && pageState === PageState.success && (
            <AnalysisReport
              systemIDs={activeSystemIDs}
              systems={activeSystems}
              singleAnalyses={singleAnalyses}
            />
          )}
        </Spin>
      </ErrorBoundary>
    </Drawer>
  );
}
