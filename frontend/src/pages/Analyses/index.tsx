import React, { useState } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

export function Analyses() {
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
        data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        axisTick: {
          alignWithLabel: true,
        },
      },
    ],
    yAxis: [
      {
        type: "value",
      },
    ],
    series: [
      {
        name: "Direct",
        type: "bar",
        barWidth: "60%",
        data: [10, 52, 200, 334, 390, 330, 220],
      },
    ],
  };

  echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    BarChart,
    CanvasRenderer,
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
      />
      <p>Bar {barIndex} is clicked.</p>
    </div>
  );
}
