import React from "react";
import { Result, Space, Tabs, Typography } from "antd";
import { SystemModel } from "../../../models";
import { AnalysisTable } from "../AnalysisTable";
import { AnalysisCase } from "../../../clients/openapi";
import { PageState } from "../../../utils";

interface Props {
  /** title of the table */
  title: string;
  task: string;
  systems: SystemModel[];
  /** sampleIDs to show for each system; numSystems x numSamples */
  cases: AnalysisCase[][];
  activeSystemIndex: number;
  onActiveSystemIndexChange: (newSystemIndex: number) => void;
  changeState: (newState: PageState) => void;
}
export function ExampleTable({
  title,
  task,
  systems,
  cases,
  activeSystemIndex,
  onActiveSystemIndexChange,
  changeState,
}: Props) {
  let exampleTable: React.ReactNode;
  if (systems.length !== cases.length) {
    console.error(
      `ExampleTable input error: systems=${systems}, cases=${cases} doesn't match`
    );
    exampleTable = <Result status="error" title="Failed to show examples." />;
  } else if (systems.length === 1) {
    // single analysis
    exampleTable = (
      <AnalysisTable
        systemID={systems[0].system_id}
        task={task}
        cases={cases[0]}
        changeState={changeState}
      />
    );
  } else {
    // multi-system analysis
    exampleTable = (
      <Space style={{ width: "fit-content" }}>
        <Tabs
          activeKey={`${activeSystemIndex}`}
          onChange={(activeKey) => onActiveSystemIndexChange(Number(activeKey))}
        >
          {systems.map((system, sysIndex) => {
            return (
              <Tabs.TabPane
                tab={system.system_info.system_name}
                key={`${sysIndex}`}
              >
                <AnalysisTable
                  systemID={system.system_id}
                  task={task}
                  cases={cases[sysIndex]}
                  changeState={changeState}
                />
              </Tabs.TabPane>
            );
          })}
        </Tabs>
      </Space>
    );
  }

  return (
    <div>
      <Typography.Title level={4}>{title}</Typography.Title>
      {exampleTable}
    </div>
  );
}
