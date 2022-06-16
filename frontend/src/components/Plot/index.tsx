import React from "react";
import ReactECharts from "echarts-for-react";

interface Props {
  xAxisData: string[];
  seriesDataList: number[][];
}

export function Plot(props: Props) {
  const { xAxisData, seriesDataList } = props;

  return (
    <ReactECharts
      option={{
        xAxis: {
          type: "category",
          data: xAxisData,
        },
        yAxis: {
          type: "value",
        },
        series: [
          {
            data: seriesDataList[0],
            type: "line",
            lineStyle: {
              color: "#25f1f5",
              width: 2,
            },
            itemStyle: {
              borderWidth: 2,
              borderColor: "#a5b0af",
            },
          },
          {
            data: seriesDataList[1],
            type: "line",
            lineStyle: {
              color: "#674ea7",
              width: 2,
            },
            itemStyle: {
              borderWidth: 2,
              borderColor: "#a5b0af",
            },
          },
        ],
      }}
    />
  );
}
