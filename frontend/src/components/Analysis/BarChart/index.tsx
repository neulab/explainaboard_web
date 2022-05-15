import React, { useEffect, useState } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart as EBarChart } from "echarts/charts";
import {
  MarkPointComponent,
  MarkLineComponent,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { ECElementEvent } from "echarts/types/src/util/types";

interface ConfidencePoint {
  xAxis: string;
  yAxis: number;
  itemStyle?: { color: string };
}

interface SeriesInfo {
  data: number[];
  labels: number[];
  confidencePoints: ConfidencePoint[];
  confidenceLines: [ConfidencePoint, ConfidencePoint][];
}

interface formatterParam {
  dataIndex: number;
  name: string;
  data: number;
}

interface Props {
  title: string;
  seriesNames: string[];
  xAxisData: string[];
  seriesDataList: number[][];
  seriesLabelsList: number[][];
  confidenceScoresList: [number, number][][];
  onBarClick: (barIndex: number, systemIndex: number) => void;
  numbersOfSamplesList: number[][];
}

export function BarChart(props: Props) {
  const {
    title,
    seriesNames,
    xAxisData,
    seriesDataList,
    seriesLabelsList,
    numbersOfSamplesList,
    confidenceScoresList,
    onBarClick,
  } = props;

  const seriesInfoList: SeriesInfo[] = [];
  let globalMaxValue = 0;

  for (let i = 0; i < seriesDataList.length; i++) {
    const seriesData = seriesDataList[i];
    const seriesLabels = seriesLabelsList[i];
    const confidenceScores = confidenceScoresList[i];

    const confidencePoints: ConfidencePoint[] = [];
    const confidenceLines: [ConfidencePoint, ConfidencePoint][] = [];

    for (let j = 0; j < seriesData.length; j++) {
      globalMaxValue = Math.max(globalMaxValue, seriesData[j]);
      const x = xAxisData[j];

      if (j < confidenceScores.length) {
        const [confidenceScoreLow, confidenceScoreHigh] = confidenceScores[j];
        globalMaxValue = Math.max(globalMaxValue, confidenceScoreHigh);
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
    seriesInfoList.push({
      data: seriesData,
      labels: seriesLabels,
      confidencePoints,
      confidenceLines,
    });
  }

  const series = seriesInfoList.map((info, infoIdx) => {
    return {
      name: seriesNames[infoIdx],
      type: "bar",
      barWidth: 50,
      label: {
        show: true,
        position: "inside",
        fontSize: 14,
        formatter: function (data: formatterParam) {
          return info.labels[data.dataIndex];
        },
      },
      data: info.data,
      animation: false,

      markPoint: {
        label: {
          show: true,
        },
        symbol: "circle",
        symbolSize: 12,
        data: info.confidencePoints,
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
        data: info.confidenceLines,
        animation: false,
      },
    };
  });

  let legend = undefined;
  if (series.length > 1) {
    legend = {
      orient: "vertical",
      right: 10,
    };
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
    legend: legend,
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "none",
      },
      formatter: function (params: formatterParam[]) {
        // For single analysis, params have length 1
        const texts = params.map((param, paramIdx) => {
          const dataIndex = param.dataIndex;
          const data = param.data.toString();
          const confidenceScores = confidenceScoresList[paramIdx];
          const numbersOfSamples = numbersOfSamplesList[paramIdx];
          const confidenceScoreRange =
            dataIndex < confidenceScores.length
              ? `[${confidenceScores[dataIndex][0]}, ${confidenceScores[dataIndex][1]}]`
              : "";
          return `${data} ${confidenceScoreRange} <br /> sample size: ${numbersOfSamples[dataIndex]}`;
        });

        return texts.join("<br />");
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
        max: Math.ceil(globalMaxValue),
      },
    ],
    series: series,
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
    LegendComponent,
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
          const { dataIndex, componentType, componentSubType } = event;
          const systemIndex = event.seriesIndex || 0;
          if (componentType === "series" && componentSubType === "bar") {
            onBarClick(dataIndex, systemIndex);
          }
        },
      }}
    />
  );
}
