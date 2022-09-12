import React from "react";
import * as echarts from "echarts/core";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { ECElementEvent } from "echarts/types/src/util/types";

interface Props {
  title: string;
  categories: string[];
  axesTitles: string[];
  entryData: number[][]; // a list of list of three numbers [col, row, number of samples]
  min: number;
  max: number;
  onEntryClick: (barIndex: number, systemIndex: number) => void;
}

export function ConfusionMatrix(props: Props) {
  const { title, categories, entryData, onEntryClick, min, max } = props;

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
      min: min,
      max: max,
    },
    series: [
      {
        name: "Number of samples",
        type: "heatmap",
        data: entryData,
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
      // ref={(e) => {
      //   setEChartsRef(e);
      // }}
      onEvents={{
        click: (event: ECElementEvent) => {
          console.log(event);
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
