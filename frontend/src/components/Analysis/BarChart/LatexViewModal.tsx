import { Modal } from "antd";
import React from "react";
import { CopyBlock, dracula } from "react-code-blocks";

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
}

export function LatexViewModal({
  title,
  visible,
  onClose,
  systemNames,
  xLabel = "",
  yLabel = "",
  yAxisMax = 1,
  xValues,
  yValues,
  confidenceScoresList,
}: Props) {
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
    `            ymax=${yAxisMax},\n` +
    "            xtick=data,\n" +
    `            xlabel=${xLabel.replace("_", "\\_")},\n` +
    `            ylabel=${yLabel.replace("_", "\\_")},\n` +
    "            legend style={at={(0.5,-0.2)},anchor=north,legend cell align=left}, % places the legend at the bottom\n" +
    `            title=${title.replace("_", "\\_")},\n` +
    `            symbolic x coords={${xValues.join()}}\n` +
    "        ]\n" +
    "%%% remove second bar in legend\n" +
    "\\pgfplotsset{\n" +
    "    legend image code/.code={\n" +
    "        \\draw [#1] (0cm,-0.1cm) rectangle (0.6cm,0.1cm);\n" +
    "    },\n" +
    "}\n";

  if (
    !(
      confidenceScoresList.length === systemNames.length &&
      systemNames.length === yValues.length
    )
  ) {
    console.error(
      "Error: Length mismatch. Expected confidenceScoresList.length === " +
        "systemNames.length === yValues.length. " +
        "Current values are, confidenceScoresList.length:" +
        `${confidenceScoresList.length}, systemNames.length:` +
        `${systemNames.length}, yValues.length:${yValues.length}`
    );
  }

  for (let sysIdx = 0; sysIdx < systemNames.length; sysIdx++) {
    let data = "";
    for (let i = 0; i < yValues[sysIdx].length; i++) {
      const errorTop = confidenceScoresList[sysIdx][i][1] - yValues[sysIdx][i];
      const errorBottom =
        yValues[sysIdx][i] - confidenceScoresList[sysIdx][i][0];
      data += `${xValues[i]} ${yValues[sysIdx][i]} ${errorBottom} ${errorTop}\n`;
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
      destroyOnClose
    >
      <h2>LaTex Bar Chart</h2>
      <CopyBlock language="latex" text={texTable} theme={dracula} />
    </Modal>
  );
}
