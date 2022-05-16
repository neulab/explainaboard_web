import React, { useEffect, useRef, useState } from "react";
import { message, Table, Tooltip, Typography } from "antd";
import { ColumnsType } from "antd/lib/table";
import { BucketCase, SystemOutput } from "../../../clients/openapi";
import { backendClient, parseBackendError } from "../../../clients";
import { PageState } from "../../../utils";

interface Props {
  systemID: string;
  task: string;
  // The latter type is for NER
  outputIDs: BucketCase[];
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
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

  const columns: ColumnsType<SystemOutput> = [];
  let dataSource;

  // task NER
  if (task === "named-entity-recognition") {
    for (const subFeatureName of Object.keys(outputIDs[0])) {
      columns.push({
        dataIndex: subFeatureName,
        title: subFeatureName,
        ellipsis: true,
      });
    }
    // TODO API request to retrieve text, should be done on every page change
    dataSource = outputIDs.map(function (o) {
      const output = o as { [key: string]: string };
      return { ...output };
    });

    // other tasks
  } else if (systemOutputs.length !== 0) {
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

    // other fields
    const systemOutputFirst = systemOutputs[0];
    for (const systemOutputKey of Object.keys(systemOutputFirst)) {
      if (systemOutputKey === "id") {
        continue;
      }
      columns.push({
        dataIndex: systemOutputKey,
        title: systemOutputKey,
        render: (value) =>
          typeof value === "number" ? (
            <div style={{ minWidth: "65px" }}>
              <Tooltip title={value}>{Math.round(value * 1e6) / 1e6}</Tooltip>
            </div>
          ) : (
            <Typography.Paragraph
              ellipsis={{ rows: 3, tooltip: true, expandable: true }}
              style={{ marginBottom: 0, minWidth: "80px", maxWidth: "170px" }}
            >
              {value}
            </Typography.Paragraph>
          ),
      });
    }
    // clone the system output for modification
    dataSource = systemOutputs.map(function (systemOutput) {
      const processedSystemOutput = { ...systemOutput };
      for (const [key, output] of Object.entries(systemOutput)) {
        /*Task like QA have object output besides string and number.
          For now we serialize the object to a displayable string.
          TODO: unnest or use a nested table
        */
        if (typeof output === "object") {
          const processedOutput = Object.entries(output)
            .map(([subKey, subOutput]) => {
              return `${subKey}: ${subOutput}`;
            })
            .join("\n");
          processedSystemOutput[key] = processedOutput;
        }
      }
      return processedSystemOutput;
    });
  }

  // TODO scroll to the bottom after rendered?
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
