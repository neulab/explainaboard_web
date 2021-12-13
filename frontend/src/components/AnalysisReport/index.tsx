import React, { useState } from "react";
import { Typography } from "antd";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { MarkPointComponent, MarkLineComponent } from "echarts/components";
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { Analysis } from "./types";
import { SystemAnalysis } from "../../clients/openapi";

interface formatterParam {
  dataIndex: number;
  name: string;
  data: number;
}

interface Props {
  analysis: SystemAnalysis;
}

export function AnalysisReport(props: Props) {
  const analysis = props.analysis as Analysis;
  const labels = analysis["results"]["fine_grained"]["label"];
  // const sentence_length_analysis = analysis["results"]["fine_grained"]["sentence_length"]
  // const token_number_analysis = analysis["results"]["fine_grained"]["token_number"]

  const xAxisData: string[] = [];
  const seriesData: number[] = [];
  const seriesLabels: number[] = [];
  const confidenceScores: [number, number][] = [];
  const confidencePoints = [];
  const confidenceLines = [];

  // Can be improved by redefining schema.
  let metricName = "";

  for (const labelArr of labels) {
    // For text classification, labelArr always has length 1
    const label = labelArr[0];
    const x = label["bucket_name"][0];
    const value = label["value"];
    const nSamples = label["n_samples"];
    const confidenceScoreLow = parseFloat(label["confidence_score_low"]);
    const confidenceScoreUp = parseFloat(label["confidence_score_up"]);
    metricName = label["metric_name"];
    const confidenceLineStart = {
      xAxis: x,
      yAxis: confidenceScoreLow,
    };
    const confidenceLineEnd = {
      xAxis: x,
      yAxis: confidenceScoreUp,
    };
    xAxisData.push(x);
    seriesData.push(parseFloat(value));
    seriesLabels.push(nSamples);
    confidenceScores.push([confidenceScoreLow, confidenceScoreUp]);
    confidencePoints.push({
      ...confidenceLineStart,
      itemStyle: { color: "brown" },
    });
    confidencePoints.push({
      ...confidenceLineEnd,
      itemStyle: { color: "orange" },
    });
    confidenceLines.push([confidenceLineStart, confidenceLineEnd]);
  }

  const option = {
    title: {
      text: metricName,
      left: "center",
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "none",
      },
      formatter: function (params: formatterParam[]) {
        // Here params always have length 1
        const param = params[0];
        const dataIndex = param.dataIndex;
        const data = param.data.toString();
        return `${data} [${confidenceScores[dataIndex][0]}, ${confidenceScores[dataIndex][1]}]`;
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: [
      {
        type: "category",
        data: xAxisData,
        axisTick: {
          alignWithLabel: true,
        },
      },
    ],
    yAxis: [
      {
        type: "value",
        beginAtZero: false,
      },
    ],
    series: [
      {
        name: "Testing",
        type: "bar",
        barWidth: "60%",
        label: {
          show: true,
          position: "inside",
          fontSize: 14,
          formatter: function (data: formatterParam) {
            return seriesLabels[data.dataIndex];
          },
        },
        color: "rgba(22,130,245,0.78)",
        data: seriesData,
        test: seriesLabels,
        animation: false,

        markPoint: {
          label: {
            show: true,
          },
          symbol: "circle",
          symbolSize: 12,
          data: confidencePoints,
        },

        markLine: {
          symbol: ["none", "none"],
          lineStyle: {
            type: "solid",
            color: "gray",
            width: 3,
          },
          label: {
            show: true,
            position: "middle",
          },
          data: confidenceLines,
          animation: false,
        },
      },
    ],
  };

  echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    BarChart,
    CanvasRenderer,
    MarkPointComponent,
    MarkLineComponent,
  ]);

  const [eChartsRef, setEChartsRef] = useState<ReactEChartsCore | null>();
  const [barIndex, setBarIndex] = useState<number>(-1);

  if (eChartsRef != null) {
    const instance = eChartsRef.getEchartsInstance();
    instance.getZr().on("click", (params) => {
      const pointInPixel = [params.offsetX, params.offsetY];
      if (instance.containPixel("grid", pointInPixel)) {
        const index = instance.convertFromPixel({ seriesIndex: 0 }, [
          params.offsetX,
          params.offsetY,
        ])[0];
        setBarIndex(index);
      }
    });
  }

  return (
    <div style={{ textAlign: "center" }}>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        notMerge={true}
        lazyUpdate={true}
        theme={"theme_name"}
        ref={(e) => {
          setEChartsRef(e);
        }}
        style={{ height: "300px", width: "300px" }}
      />
      <Typography.Paragraph code>
        Bar {barIndex} is clicked.
      </Typography.Paragraph>
    </div>
  );
}
