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
  confidenceScores: [number, number][];
}

export function BarChart(props: Props) {
  const { title, xAxisData, seriesData, seriesLabels, confidenceScores } =
    props;
  const confidencePoints = [];
  const confidenceLines = [];

  for (let i = 0; i < xAxisData.length; i++) {
    const x = xAxisData[i];
    const [confidenceScoreLow, confidenceScoreUp] = confidenceScores[i];
    const confidenceLowPoint = {
      xAxis: x,
      yAxis: confidenceScoreLow,
    };
    const confidenceUpPoint = {
      xAxis: x,
      yAxis: confidenceScoreUp,
    };
    confidencePoints.push({
      ...confidenceLowPoint,
      itemStyle: { color: "brown" },
    });
    confidencePoints.push({
      ...confidenceUpPoint,
      itemStyle: { color: "orange" },
    });
    confidenceLines.push([confidenceLowPoint, confidenceUpPoint]);
  }

  // config to be passed in echart
  const option = {
    title: {
      text: title,
      left: "center",
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
        min: 0,
        max: 1,
      },
    ],
    series: [
      {
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
    EBarChart,
    CanvasRenderer,
    MarkPointComponent,
    MarkLineComponent,
  ]);
  const [barIndex, setBarIndex] = useState<number>(-1);
  const [eChartsRef, setEChartsRef] = useState<ReactEChartsCore | null>();

  useEffect(() => {
    if (eChartsRef != null) {
      const instance = eChartsRef.getEchartsInstance();
      instance.resize();
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
  });

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
    />
  );
}
