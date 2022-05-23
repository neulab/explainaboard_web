import React, { useEffect, useRef, useState } from "react";
import { message, Table, Tooltip, Typography } from "antd";
import { ColumnsType } from "antd/lib/table";
import { BucketCase, SystemOutput } from "../../../clients/openapi";
import { backendClient, parseBackendError } from "../../../clients";
import { PageState } from "../../../utils";

interface Props {
  systemID: string;
  task: string;
  outputIDs: BucketCase[];
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
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
    if (col["name"] == "id") {
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
  outputIDs: BucketCase[],
  columns: ColumnsType<SystemOutput>
): { [key: string]: string }[] {
  const dataSource: { [key: string]: string }[] = [];

  // This is a feature defined over individual entities
  if ("token_span" in outputIDs[0]) {
    const col_info = [
      { id: "span", name: "Span Text" },
      { id: "true_label", name: "True Label" },
      { id: "pred_label", name: "Predicted Label" },
      { id: "sentence", name: "Sentence", maxWidth: "800px" },
    ];

    renderColInfo(columns, col_info);

    for (let i = 0; i < systemOutputs.length; i++) {
      // Get the outputs from the bucket case
      const origToks = systemOutputs[i][outputIDs[i]["orig_str"]];
      let sentence = origToks;
      const pos = outputIDs[i]["token_span"];
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
      const spanPos =
        pos[0] === pos[1] - 1 ? `${pos[0]}` : `${pos[0]}:${pos[1]}`;
      const dataRow = {
        span: outputIDs[i]["text"],
        true_label: outputIDs[i]["true_label"],
        pred_label: outputIDs[i]["predicted_label"],
        sentence: sentence,
        id: `${outputIDs[i]["sample_id"]}[${spanPos}]`,
      };
      console.log(systemOutputs[i]);
      console.log(outputIDs[i]);
      console.log(dataRow);
      dataSource.push(dataRow);
    }
  }
  // This is feature defined over whole sentences
  else {
    const col_info = [{ id: "sentence", name: "Sentence", maxWidth: "800px" }];

    renderColInfo(columns, col_info);

    for (let i = 0; i < systemOutputs.length; i++) {
      // Get the outputs from the bucket case
      const origToks = systemOutputs[i]["tokens"];
      const sentence = Array.isArray(origToks) ? origToks.join(" ") : origToks;
      const dataRow = {
        sentence: sentence,
        id: outputIDs[i]["sample_id"],
      };
      dataSource.push(dataRow);
    }
  }

  return dataSource;
}

export function AnalysisTable({
  systemID,
  task,
  outputIDs,
  page,
  setPage,
}: Props) {
  const [pageState, setPageState] = useState(PageState.loading);
  const [systemOutputs, setSystemOutputs] = useState<SystemOutput[]>([]);
  const pageSize = 10;
  const total = outputIDs.length;
  const offset = page * pageSize;
  const end = Math.min(offset + pageSize, outputIDs.length);
  const outputIDString = outputIDs
    .slice(offset, end)
    .map(function (x) {
      return x["sample_id"];
    })
    .join(",");
  const tableRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    async function refreshSystemOutputs() {
      setPageState(PageState.loading);
      try {
        const result = await backendClient.systemsSystemIdOutputsGet(
          systemID,
          outputIDString
        );
        setSystemOutputs(result.system_outputs);
      } catch (e) {
        if (e instanceof Response) {
          const error = await parseBackendError(e);
          if (error.error_code === 40301) {
            message.warn(error.getErrorMsg());
          } else {
            message.error(error.getErrorMsg());
          }
        }
      } finally {
        setPageState(PageState.success);
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
  }, [systemID, outputIDString, page, pageSize]);

  // other fields
  if (systemOutputs.length === 0) {
    return <div>System outputs will display here.</div>;
  }

  const columns: ColumnsType<SystemOutput> = [];

  const condgenTasks = [
    "machine-translation",
    "summarization",
    "conditional_generation",
  ];
  const seqLabTasks = [
    "named-entity-recognition",
    "chunking",
    "word-segmentation",
  ];

  let dataSource: { [p: string]: any }[];
  let colInfo;
  if (seqLabTasks.includes(task)) {
    dataSource = specifyDataSeqLab(systemOutputs, outputIDs, columns);
  } else if (condgenTasks.includes(task)) {
    colInfo = [
      { id: "source", name: "Source", maxWidth: "500px" },
      { id: "reference", name: "Reference", maxWidth: "500px" },
      { id: "hypothesis", name: "Hypothesis", maxWidth: "500px" },
    ];
    dataSource = specifyDataGeneric(systemOutputs, columns, colInfo);
  } else if (task == "text-classification") {
    colInfo = [
      { id: "true_label", name: "True Label" },
      { id: "predicted_label", name: "Predicted Label" },
      { id: "text", name: "Text", maxWidth: "800px" },
    ];
    dataSource = specifyDataGeneric(systemOutputs, columns, colInfo);
  } else if (task == "text-pair-classification") {
    colInfo = [
      { id: "true_label", name: "True Label" },
      { id: "predicted_label", name: "Predicted Label" },
      { id: "text1", name: "Text 1", maxWidth: "500px" },
      { id: "text2", name: "Text 2", maxWidth: "500px" },
    ];
    dataSource = specifyDataGeneric(systemOutputs, columns, colInfo);
  } else {
    dataSource = specifyDataGeneric(systemOutputs, columns);
  }

  return (
    <Table
      ref={tableRef}
      columns={columns}
      dataSource={dataSource}
      loading={pageState === PageState.loading}
      rowKey="id"
      size="small"
      pagination={{
        total,
        showTotal: (total, range) =>
          `${range[0]}-${range[1]} (total: ${total})`,
        pageSize,
        // conversion between 0-based and 1-based index
        current: page + 1,
        onChange: (newPage, newPageSize) => {
          setPage(newPage - 1);
        },
      }}
      scroll={{ y: 550, x: "max-content", scrollToFirstRowOnChange: true }}
    />
  );
}
