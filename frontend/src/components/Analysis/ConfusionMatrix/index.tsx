import React from "react";
import * as echarts from "echarts/core";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { ECElementEvent } from "echarts/types/src/util/types";

interface Props {
  title: string;
  categories: string[];
  axesTitles: string[];
  entryData: number[][]; // a list of list of three numbers [col, row, number of samples]
  onEntryClick: (barIndex: number, systemIndex: number) => void;
}

export function ConfusionMatrix(props: Props) {
  const { title, categories, entryData, onEntryClick } = props;

  let entryDataSum = 0;
  entryData.forEach((entry) => (entryDataSum += entry[2]));
  const entryRatioData = entryData.map((entry) => [
    entry[0],
    entry[1],
    +(entry[2] / entryDataSum).toFixed(3),
  ]);

  // Get array min and max
  let min = Infinity;
  let minRatio = Infinity;
  let max = 0;
  let maxRatio = 0;

  for (let i = 0; i < entryData.length; i++) {
    const nSamples = entryData[i][2];
    const ratio = entryRatioData[i][2];
    min = Math.min(min, nSamples);
    max = Math.max(max, nSamples);
    minRatio = Math.min(minRatio, ratio);
    maxRatio = Math.max(maxRatio, ratio);
  }

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
      position: "top",
    },
    toolbox: {
      show: true,
      feature: {
        saveAsImage: { show: true },
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: categories,
      splitArea: {
        show: true,
      },
    },
    yAxis: {
      type: "category",
      data: categories,
      splitArea: {
        show: true,
      },
    },
    visualMap: {
      show: false,
      min: minRatio,
      max: maxRatio,
    },
    series: [
      {
        name: "True Label: ",
        type: "heatmap",
        data: entryRatioData,
        label: {
          show: true,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
  };

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge={true}
      lazyUpdate={true}
      theme={"theme_name"}
      onEvents={{
        click: (event: ECElementEvent) => {
          const { dataIndex, componentType, componentSubType } = event;
          const systemIndex = event.seriesIndex || 0;
          if (componentType === "series" && componentSubType === "heatmap") {
            onEntryClick(dataIndex, systemIndex);
          }
        },
      }}
    />
  );
}
