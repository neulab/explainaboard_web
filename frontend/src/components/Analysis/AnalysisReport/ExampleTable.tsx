import { Space, Tabs, Typography } from "antd";
import React from "react";
import { SystemModel } from "../../../models";
import { AnalysisTable } from "../AnalysisTable";
import { ActiveSystemExamples } from "../types";
import { compareBucketOfCases } from "../utils";
interface Props {
  task: string;
  systems: SystemModel[];
  activeSystemExamples: ActiveSystemExamples | undefined;
  setActiveSystemExamples: React.Dispatch<
    React.SetStateAction<ActiveSystemExamples | undefined>
  >;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}
export function ExampleTable({
  task,
  systems,
  activeSystemExamples,
  setActiveSystemExamples,
  page,
  setPage,
}: Props) {
  let exampleTable = <div>&nbsp;</div>;
  if (activeSystemExamples === undefined) {
    return exampleTable;
  }

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
              <Tabs.TabPane
                tab={system.system_info.system_name}
                key={`${sysIndex}`}
              >
                <AnalysisTable
                  systemID={system.system_id}
                  task={task}
                  cases={sortedBucketOfCasesList[sysIndex]}
                  page={page}
                  onPageChange={setPage}
                />
              </Tabs.TabPane>
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
      <Typography.Title level={4}>{`${exampleText} from ${barText} #${
        barIndex + 1
      } in ${title}`}</Typography.Title>
      {exampleTable}
    </div>
  );
  return exampleTable;
}
