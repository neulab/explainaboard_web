import React, { useMemo } from "react";
import { Result, Space, Tabs, Typography } from "antd";
import { SystemModel } from "../../../models";
import { AnalysisTable } from "../AnalysisTable";
import { AnalysisCase } from "../../../clients/openapi";
import { PageState } from "../../../utils";

import { taskColumnMapping } from "../AnalysisTable/taskColumnMapping";
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
  /** whether we can put multiple system outputs in the same table */
  const taskColumns = taskColumnMapping.get(task);
  const systemIDs = useMemo(
    () => systems.map((system) => system.system_id),
    [systems]
  );
  const systemNames = useMemo(
    () => systems.map((system) => system.system_info.system_name),
    [systems]
  );
  const systemIDsArray = useMemo(
    () => systems.map((system) => [system.system_id]),
    [systems]
  );

  if (systems.length !== cases.length) {
    console.error(
      `ExampleTable input error: systems=${systems}, cases=${cases} doesn't match`
    );
    exampleTable = <Result status="error" title="Failed to show examples." />;
  } else if (taskColumns !== undefined || systems.length === 1) {
    // TODO(noel): need to expand for every task
    // all single analysis cases + multi-system analysis for tasks with column info
    exampleTable = (
      <AnalysisTable
        systemIDs={systemIDs}
        systemNames={systemNames}
        task={task}
        cases={cases[0]}
        changeState={changeState}
      />
    );
  } else {
    // multi-system analysis for tasks without column info
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
                  systemIDs={systemIDsArray[sysIndex]}
                  systemNames={[system.system_info.system_name]}
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
