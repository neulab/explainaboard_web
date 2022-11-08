import { Modal, Table } from "antd";
import Paragraph from "antd/lib/typography/Paragraph";
import Title from "antd/lib/typography/Title";
import React from "react";

const decimalPlaces = 3;

interface Props {
  title: string;
  visible: boolean;
  onClose: () => void;
  systemNames: string[];
  xValues: string[];
  yValues: number[][];
  xLabel?: string;
  yLabel?: string;
  confidenceScoresList: number[][][];
  numbersOfSamplesList: number[][];
}

export function DataViewModal({
  title,
  visible,
  onClose,
  systemNames,
  xLabel,
  yLabel,
  xValues,
  yValues,
  confidenceScoresList,
  numbersOfSamplesList,
}: Props) {
  const formattedxAxisData = xValues.map((x) => x.replace("\n|\n", "-"));
  const trimmedConfidenceScores = confidenceScoresList.map(
    (confidenceScores) => {
      return confidenceScores.map(([lo, hi]) => {
        const loTrimmed = lo !== null ? Number(lo.toFixed(decimalPlaces)) : -1;
        const hiTrimmed = hi !== null ? Number(hi.toFixed(decimalPlaces)) : -1;
        return [loTrimmed, hiTrimmed];
      });
    }
  );
  const dataSrc = [];
  for (let i = 0; i < yValues[0].length; i++) {
    for (let sysIdx = 0; sysIdx < systemNames.length; sysIdx++) {
      dataSrc.push({
        xValue: formattedxAxisData[i],
        systemName: systemNames[sysIdx],
        yValue: yValues[sysIdx][i],
        confInterval: `[${trimmedConfidenceScores[sysIdx][i][0]}, ${trimmedConfidenceScores[sysIdx][i][1]}]`,
        sampleSize: numbersOfSamplesList[sysIdx][i],
      });
    }
  }

  const columns = [
    {
      title: "X Axis Value",
      key: "xValue",
      dataIndex: "xValue",
    },
    {
      title: "System Name",
      key: "systemName",
      dataIndex: "systemName",
    },
    {
      title: "Y Axis Value",
      key: "yValue",
      dataIndex: "yValue",
    },
    {
      title: "Confidence Interval",
      key: "confInterval",
      dataIndex: "confInterval",
    },
    {
      title: "Sample Size",
      key: "sampleSize",
      dataIndex: "sampleSize",
    },
  ];
  const table = <Table dataSource={dataSrc} columns={columns} />;
  xLabel = xLabel === undefined ? "" : xLabel;
  yLabel = yLabel === undefined ? "" : yLabel;

  const legend = `\\legend{${systemNames.join()}}\n`;

  const addPlotPrefix =
    "\\addplot+ [ybar]\n" +
    "    plot [error bars/.cd, y dir=both, y explicit]\n" +
    "    table [y error plus=y-max, y error minus=y-min] {\n" +
    "x y y-min y-max\n";
  const addPlotSuffix = "};\n";

  let texTable =
    "% Bar chart drawing library\n\\usepackage{pgfplots}\n\n" +
    "\\begin{tikzpicture}\n" +
    "\\begin{axis}[\n" +
    "            ybar,\n" +
    "            ymin=0,\n" +
    "            ymax=1,\n" +
    "            xtick=data,\n" +
    `            xlabel=${xLabel},\n` +
    `            ylabel=${yLabel},\n` +
    `            title=${title},\n` +
    `            symbolic x coords={${formattedxAxisData.join()}}\n` +
    "        ]\n";

  for (let sysIdx = 0; sysIdx < systemNames.length; sysIdx++) {
    let data = "";
    for (let i = 0; i < yValues[sysIdx].length; i++) {
      const errorTop =
        trimmedConfidenceScores[sysIdx][i][1] - yValues[sysIdx][i];
      const errorBottom =
        yValues[sysIdx][i] - trimmedConfidenceScores[sysIdx][i][0];
      data += `${formattedxAxisData[i]} ${yValues[sysIdx][i]} ${errorBottom} ${errorTop}\n`;
    }
    texTable += addPlotPrefix + data + addPlotSuffix;
  }

  texTable += legend + "\\end{axis}\n\\end{tikzpicture}";

  return (
    <Modal
      title={title}
      visible={visible}
      footer={null}
      onCancel={onClose}
      width="50%"
    >
      {table}
      <Title>Tex Table Format</Title>
      <Paragraph copyable>
        <pre>{texTable}</pre>
      </Paragraph>
    </Modal>
  );
}
