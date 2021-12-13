import React, { useState } from "react";
import { Typography } from "antd";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { MarkLineComponent } from "echarts/components";
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { Analysis } from "./types";
import { SystemAnalysis } from "../../clients/openapi";

interface data {
  name: string;
  data: number;
  test: number;
}

interface Props {
  analysis: SystemAnalysis;
}

export function AnalysisReport(props: Props) {
  const analysis = props.analysis as Analysis;
  const labels = analysis["results"]["fine_grained"]["label"];
  // const sentence_length_analysis = analysis["results"]["fine_grained"]["sentence_length"]
  // const token_number_analysis = analysis["results"]["fine_grained"]["token_number"]

  const xAxisData = [];
  const seriesData = [];
  const confidence_lines = [];

  for (const label_arr of labels) {
    // For text classification, label_arr always has length 1
    const label = label_arr[0];
    const x = label["bucket_name"];
    const value = label["value"];
    const confidence_line_start = {
      xAxis: x,
      yAxis: parseFloat(label["confidence_score_low"]),
    };
    const confidence_line_end = {
      xAxis: x,
      yAxis: parseFloat(label["confidence_score_up"]),
    };
    xAxisData.push(x);
    seriesData.push(parseFloat(value));
    confidence_lines.push([confidence_line_start, confidence_line_end]);
  }

  console.log(xAxisData, seriesData, confidence_lines);

  const option = {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
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
        // min: 90,
        // max: 100,
        beginAtZero: false,
      },
    ],
    series: [
      {
        name: "",
        type: "bar",
        barWidth: "60%",
        label: {
          show: true,
          position: "inside",
          formatter: function (d: data) {
            console.log(d);
            return d.test; // not working
          },
        },
        data: seriesData,
        animation: false,
        // not working
        // markPoint: {
        //   symbol: 'circle',
        //   symbolSize: '100',
        //   data: [
        //       {
        //         xAxis: "0",
        //         yAxis: 0.8,
        //       },
        //       {
        //         xAxis: "1",
        //         yAxis: 0.5,
        //       }
        //   ]
        // },
        markLine: {
          symbol: ["circle", "circle"],
          lineStyle: {
            type: "solid",
            color: "black",
            width: 3,
          },
          label: {
            show: true,
            position: "middle",
          },
          data: confidence_lines,
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

    instance.getZr().on("mousemove", (param) => {
      const pointInPixel = [param.offsetX, param.offsetY];
      if (instance.containPixel("grid", pointInPixel)) {
        instance.getZr().setCursorStyle("pointer");
      } else {
        instance.getZr().setCursorStyle("default");
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
