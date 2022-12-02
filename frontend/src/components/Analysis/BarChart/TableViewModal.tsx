import { Modal, Table } from "antd";
import { ColumnsType } from "antd/lib/table";
import React from "react";

interface BarChartData {
  [key: string]: string | number;
}

interface Props {
  title: string;
  visible: boolean;
  onClose: () => void;
  systemNames: string[];
  xValues: string[];
  yValues: number[][];
  xLabel?: string;
  yLabel?: string;
  yAxisMax?: number;
  confidenceScoresList: number[][][];
  numbersOfSamplesList: number[][];
}

export function TableViewModal({
  title,
  visible,
  onClose,
  systemNames,
  xValues,
  yValues,
  confidenceScoresList,
  numbersOfSamplesList,
}: Props) {
  if (
    !(
      confidenceScoresList.length === systemNames.length &&
      systemNames.length === yValues.length &&
      numbersOfSamplesList.length === systemNames.length
    )
  ) {
    console.error(
      "Error: Length mismatch. Expected confidenceScoresList.length === " +
        "systemNames.length === yValues.length === numbersOfSamplesList.length. " +
        "Current values are, confidenceScoresList.length:" +
        `${confidenceScoresList.length}, systemNames.length:` +
        `${systemNames.length}, yValues.length:${yValues.length}, ` +
        `numbersOfSamplesList.length: ${numbersOfSamplesList.length}`
    );
  }

  const dataSrc: BarChartData[] = [];
  for (let i = 0; i < yValues[0].length; i++) {
    for (let sysIdx = 0; sysIdx < systemNames.length; sysIdx++) {
      dataSrc.push({
        rowKey: `sys${sysIdx}-${i}`,
        xValue: xValues[i],
        systemName: systemNames[sysIdx],
        yValue: yValues[sysIdx][i],
        confInterval: `[${confidenceScoresList[sysIdx][i][0]}, ${confidenceScoresList[sysIdx][i][1]}]`,
        sampleSize:
          numbersOfSamplesList[sysIdx][i] === -1
            ? "-"
            : numbersOfSamplesList[sysIdx][i],
      });
    }
  }

  const columns: ColumnsType<BarChartData> = [
    {
      title: "X Axis Value",
      dataIndex: "xValue",
    },
    {
      title: "System Name",
      dataIndex: "systemName",
    },
    {
      title: "Y Axis Value",
      dataIndex: "yValue",
    },
    {
      title: "Confidence Interval",
      dataIndex: "confInterval",
    },
    {
      title: "Sample Size",
      dataIndex: "sampleSize",
    },
  ];

  return (
    <Modal
      title={title}
      visible={visible}
      footer={null}
      onCancel={onClose}
      width="50%"
      destroyOnClose
    >
      <Table pagination={false} dataSource={dataSrc} columns={columns} />
    </Modal>
  );
}
