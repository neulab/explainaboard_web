import React, { useEffect, useRef, useState } from "react";
import { message, Table, Tooltip, Typography } from "antd";
import { ColumnsType } from "antd/lib/table";
import { AnalysisCase, SystemOutput } from "../../../clients/openapi";
import { backendClient, parseBackendError } from "../../../clients";
import { PageState } from "../../../utils";
import {
  taskColumnMapping,
  seqLabTasks,
} from "../AnalysisTable/taskColumnMapping";
import { joinResults, addPredictionColInfo, unnestSystemOutput } from "./utils";

interface Props {
  systemIDs: string[];
  systemNames: string[];
  task: string;
  casesList: AnalysisCase[][];
  changeState: (newState: PageState) => void;
}

function renderColInfo(
  columns: ColumnsType<SystemOutput>,
  colInfo: { [key: string]: string | undefined }[]
) {
  // example ID
  columns.push({
    dataIndex: "id",
    title: "ID",
    fixed: "left",
    render: (value) => (
      <Typography.Paragraph copyable style={{ marginBottom: 0 }}>
        {value}
      </Typography.Paragraph>
    ),
  });

  for (const col of colInfo) {
    if (col["name"] === "id") {
      continue;
    }
    const maxWidth = col["maxWidth"] !== undefined ? col["maxWidth"] : "170px";
    columns.push({
      dataIndex: col["id"],
      title: col["name"],
      render: (value) =>
        typeof value === "number" ? (
          <div style={{ minWidth: "65px" }}>
            <Tooltip title={value}>{Math.round(value * 1e6) / 1e6}</Tooltip>
          </div>
        ) : (
          <Typography.Paragraph
            ellipsis={{ rows: 3, tooltip: true, expandable: true }}
            style={{ marginBottom: 0, minWidth: "80px", maxWidth: maxWidth }}
          >
            {value}
          </Typography.Paragraph>
        ),
    });
  }
}

function createSentenceForSeqLab(
  systemOutput: SystemOutput,
  analysisCase: AnalysisCase
) {
  const origToks = systemOutput["tokens"];
  let sentence = origToks;
  const pos = analysisCase["token_span"];
  if (Array.isArray(origToks)) {
    const copiedToks = origToks.map((x: string) => `${x} `);
    const prefix = copiedToks.slice(0, pos[0]).join(" ");
    const infix = copiedToks.slice(pos[0], pos[1]).join(" ");
    const suffix = copiedToks.slice(pos[1]).join(" ");
    sentence = (
      <div>
        {prefix} <b>{infix}</b> {suffix}
      </div>
    );
  }
  return sentence;
}

function specifyDataGeneric(
  systemOutputs: SystemOutput[],
  columns: ColumnsType<SystemOutput>,
  colInfo: { [key: string]: string }[] | undefined = undefined
): { [key: string]: string }[] {
  const systemOutputFirst = systemOutputs[0];

  colInfo =
    colInfo !== undefined
      ? colInfo
      : Object.keys(systemOutputFirst).map((x) => {
          return { id: x, name: x };
        });
  renderColInfo(columns, colInfo);

  // clone the system output for modification
  return systemOutputs.map(function (systemOutput) {
    const processedSystemOutput = { ...systemOutput };
    for (const [key, output] of Object.entries(systemOutput)) {
      /*Task like QA have object output besides string and number.
        For now we serialize the object to a displayable string.
        TODO: unnest or use a nested table
      */
      if (typeof output === "object") {
        processedSystemOutput[key] = Object.entries(output)
          .map(([subKey, subOutput]) => {
            return `${subKey}: ${subOutput}`;
          })
          .join("\n");
      }
    }
    return processedSystemOutput;
  });
}

function specifyDataSeqLab(
  systemOutputs: SystemOutput[],
  cases: AnalysisCase[],
  columns: ColumnsType<SystemOutput>
): { [key: string]: string }[] {
  const dataSource: { [key: string]: string }[] = [];

  // This is a feature defined over individual entities
  if ("token_span" in cases[0]) {
    const colInfo = [
      { id: "sentence", name: "Sentence", maxWidth: "400px" },
      { id: "span", name: "Span Text" },
      { id: "true_label", name: "True Label" },
      { id: "pred_label", name: "Predicted Label" },
    ];

    renderColInfo(columns, colInfo);

    for (let i = 0; i < systemOutputs.length; i++) {
      // Get the outputs from the bucket case
      const sentence = createSentenceForSeqLab(systemOutputs[i], cases[i]);
      const pos = cases[i]["token_span"];
      const spanPos =
        pos[0] === pos[1] - 1 ? `${pos[0]}` : `${pos[0]}:${pos[1]}`;
      const dataRow = {
        span: cases[i]["text"],
        true_label: cases[i]["true_label"],
        pred_label: cases[i]["predicted_label"],
        sentence: sentence,
        id: `${cases[i]["sample_id"]}[${spanPos}]`,
      };
      dataSource.push(dataRow);
    }
  }
  // This is feature defined over whole sentences
  else {
    const colInfo = [{ id: "sentence", name: "Sentence", maxWidth: "800px" }];

    renderColInfo(columns, colInfo);

    for (let i = 0; i < systemOutputs.length; i++) {
      // Get the outputs from the bucket case
      const origToks = systemOutputs[i]["tokens"];
      const sentence = Array.isArray(origToks) ? origToks.join(" ") : origToks;
      const dataRow = {
        sentence: sentence,
        id: cases[i]["sample_id"],
      };
      dataSource.push(dataRow);
    }
  }

  return dataSource;
}

export function AnalysisTable({
  systemIDs,
  systemNames,
  task,
  casesList,
  changeState,
}: Props) {
  // the cases for each system are the same except for predicted_label
  const cases = casesList[0];
  const [page, setPage] = useState(0);
  const [systemOutputs, setSystemOutputs] = useState<SystemOutput[]>([]);
  const pageSize = 10;
  const total = cases.length;
  const tableRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    setPage(0);
  }, [cases]);

  const offset = page * pageSize;
  const end = Math.min(offset + pageSize, cases.length);
  useEffect(() => {
    async function refreshSystemOutputs() {
      changeState(PageState.loading);
      try {
        const outputIDs = cases.slice(offset, end).map((x) => x.sample_id);
        let joinedResult: SystemOutput[] = [];
        const results = [];
        for (const systemID of systemIDs) {
          const result = await backendClient.systemOutputsGetById(
            systemID,
            outputIDs
          );
          results.push(result);
        }

        // join the results if it is one of the supported tasks and is multi-system
        const taskCols = taskColumnMapping.get(task);
        if (results.length > 1 && taskCols !== undefined) {
          const predCol = taskCols.predictionColumns[0].id;
          joinedResult = joinResults(results, predCol);
        } else {
          joinedResult = results[0];
        }

        setSystemOutputs(joinedResult);
      } catch (e) {
        console.log("error", e);
        if (e instanceof Response) {
          const error = await parseBackendError(e);
          if (error.error_code === 40301) {
            message.warn(error.getErrorMsg());
          } else {
            message.error(error.getErrorMsg());
          }
        }
      } finally {
        changeState(PageState.success);
        /*
        The table after the 1st scroll may be incomplete as the async API call
        is not finished. If we stop there, the bottom portion of the examples will
        be concealed. Therefore, we need a 2nd scroll to bring the entire table
        into view after the API call completes.
        */
        tableRef.current?.scrollIntoView();
      }
    }
    refreshSystemOutputs();
    /*
    1st scroll to the table, which is likely still loading and
    incomplete. This is needed so the scroll is immediate and
    users will not experience a delay due to the async API call.
    */
    tableRef.current?.scrollIntoView();
  }, [page, pageSize, cases, changeState, systemIDs, task, offset, end]);

  // other fields
  if (systemOutputs.length === 0) {
    return <div>System outputs will display here.</div>;
  }

  const columns: ColumnsType<SystemOutput> = [];

  let dataSource: { [p: string]: string }[];
  let colInfo;
  const numSystems = systemIDs.length;
  const taskCols = taskColumnMapping.get(task);
  if (seqLabTasks.includes(task)) {
    dataSource = specifyDataSeqLab(
      systemOutputs,
      cases.slice(offset, end),
      columns
    );
  } else if (taskCols !== undefined) {
    colInfo = addPredictionColInfo(task, systemNames);
    /* expand columns if it is multi-system analysis */
    if (numSystems > 1) {
      dataSource = specifyDataGeneric(
        unnestSystemOutput(systemOutputs, taskCols.predictionColumns[0].id),
        columns,
        colInfo
      );
    } else {
      dataSource = specifyDataGeneric(systemOutputs, columns, colInfo);
    }
  } else {
    dataSource = specifyDataGeneric(systemOutputs, columns);
  }

  return (
    <Table
      ref={tableRef}
      columns={columns}
      dataSource={dataSource}
      rowKey="id"
      size="small"
      pagination={{
        total,
        showTotal: (total, range) =>
          `${range[0]}-${range[1]} (total: ${total})`,
        pageSize,
        // conversion between 0-based and 1-based index
        current: page + 1,
        onChange: (newPage) => setPage(newPage - 1),
      }}
      scroll={{ y: 550, x: "max-content", scrollToFirstRowOnChange: true }}
    />
  );
}
