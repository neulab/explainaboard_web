import { Modal } from "antd";
import React from "react";
import { CopyBlock, dracula } from "react-code-blocks";

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
  yAxisMax?: number;
  confidenceScoresList: number[][][];
}

export function LatexViewModal({
  title,
  visible,
  onClose,
  systemNames,
  xLabel,
  yLabel,
  yAxisMax,
  xValues,
  yValues,
  confidenceScoresList,
}: Props) {
  yAxisMax = yAxisMax === undefined ? 1 : yAxisMax;
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
    `            ymax=${yAxisMax},\n` +
    "            xtick=data,\n" +
    `            xlabel=${xLabel.replace("_", "\\_")},\n` +
    `            ylabel=${yLabel.replace("_", "\\_")},\n` +
    "            legend style={at={(0.5,-0.2)},anchor=north,legend cell align=left}, % places the legend at the bottom\n" +
    `            title=${title.replace("_", "\\_")},\n` +
    `            symbolic x coords={${formattedxAxisData.join()}}\n` +
    "        ]\n" +
    "%%% remove second bar in legend\n" +
    "\\pgfplotsset{\n" +
    "    legend image code/.code={\n" +
    "        \\draw [#1] (0cm,-0.1cm) rectangle (0.6cm,0.1cm);\n" +
    "    },\n" +
    "}\n";

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
      <h2>LaTex Bar Chart</h2>
      <CopyBlock language="latex" text={texTable} theme={dracula} />
    </Modal>
  );
}
