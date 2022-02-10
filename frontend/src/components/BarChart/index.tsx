import React, { useEffect, useState } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { MarkPointComponent, MarkLineComponent } from "echarts/components";
import { BarChart as EBarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { ECElementEvent } from "echarts/types/src/util/types";

interface formatterParam {
  dataIndex: number;
  name: string;
  data: number;
}

interface Props {
  title: string;
  xAxisData: string[];
  seriesData: number[];
  seriesLabels: number[];
  numbersOfSamples: number[];
  confidenceScores: [number, number][];
  onBarClick: (barIndex: number) => void;
}

export function BarChart(props: Props) {
  const {
    title,
    xAxisData,
    seriesData,
    seriesLabels,
    numbersOfSamples,
    confidenceScores,
    onBarClick,
  } = props;
  let seriesMaxValue = 0;
  const confidencePoints = [];
  const confidenceLines = [];

  for (let i = 0; i < xAxisData.length; i++) {
    const x = xAxisData[i];
    seriesMaxValue = Math.max(seriesMaxValue, seriesData[i]);

    if (i < confidenceScores.length) {
      const [confidenceScoreLow, confidenceScoreHigh] = confidenceScores[i];
      seriesMaxValue = Math.max(seriesMaxValue, confidenceScoreHigh);
      const confidenceLowPoint = {
        xAxis: x,
        yAxis: confidenceScoreLow,
      };
      const confidenceHighPoint = {
        xAxis: x,
        yAxis: confidenceScoreHigh,
      };
      confidencePoints.push({
        ...confidenceLowPoint,
        itemStyle: { color: "brown" },
      });
      confidencePoints.push({
        ...confidenceHighPoint,
        itemStyle: { color: "orange" },
      });
      confidenceLines.push([confidenceLowPoint, confidenceHighPoint]);
    }
  }

  // config to be passed in echart
  const option = {
    title: {
      text: title,
      left: "center",
      textStyle: {
        width: "250",
        overflow: "break",
      },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "none",
      },
      formatter: function (params: formatterParam[]) {
        // For text classification, params always have length 1
        const param = params[0];
        const dataIndex = param.dataIndex;
        const data = param.data.toString();
        const confidenceScoreRange =
          dataIndex < confidenceScores.length
            ? `[${confidenceScores[dataIndex][0]}, ${confidenceScores[dataIndex][1]}]`
            : "";
        return `${data} ${confidenceScoreRange} <br /> sample size: ${numbersOfSamples[dataIndex]}`;
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
        // TODO: get min max from SDK?
        // min: 0,
        max: Math.ceil(seriesMaxValue),
      },
    ],
    series: [
      {
        type: "bar",
        barWidth: 50,
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

  const [eChartsRef, setEChartsRef] = useState<ReactEChartsCore | null>();

  // Must call resize or else echarts has no width and height information.
  useEffect(() => {
    if (eChartsRef != null) {
      const instance = eChartsRef.getEchartsInstance();
      instance.resize();
    }
  });

  echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    EBarChart,
    CanvasRenderer,
    MarkPointComponent,
    MarkLineComponent,
  ]);

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge={true}
      lazyUpdate={true}
      theme={"theme_name"}
      ref={(e) => {
        setEChartsRef(e);
      }}
      onEvents={{
        click: (event: ECElementEvent) => {
          const barIndex = event.dataIndex;
          onBarClick(barIndex);
        },
      }}
    />
  );
}
