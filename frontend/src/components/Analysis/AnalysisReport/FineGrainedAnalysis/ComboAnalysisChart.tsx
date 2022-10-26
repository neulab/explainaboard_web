import React from "react";
import * as echarts from "echarts/core";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { ECElementEvent } from "echarts/types/src/util/types";
import { SystemModel } from "../../../../models";
import { ResultFineGrainedParsed } from "../../types";
import { Col } from "antd";

interface Props {
  title: string;
  systems: SystemModel[];
  analyses: ResultFineGrainedParsed[];
  colSpan: 8 | 12 | 24;
  onEntryClick: (
    samples: number[][],
    systemID: string,
    barIndex: number,
    systemIndex: number
  ) => void;
}

export function ComboAnalysisChart(props: Props) {
  const { systems, analyses, title, onEntryClick, colSpan } = props;

  // For now we only support combo analysis for single-system analysis.
  if (analyses.length !== 1) {
    return <></>;
  }

  const system = systems[0];
  const analysis = analyses[0];
  const counts = analysis.comboCounts;
  if (counts.length < 1) {
    return <></>;
  }

  // Gather all categories and assign index to each of them
  const cateMap = new Map<string, number>();
  const categories = [];
  let idx = 0;
  for (const c of counts) {
    for (const cateString of c.bucket) {
      if (!cateMap.has(cateString)) {
        cateMap.set(cateString, idx);
        categories.push(cateString);
        idx++;
      }
    }
  }

  // Parse analysis results to entry data
  const samples: number[][] = [];
  const entryData: number[][] = [];
  for (const count of counts) {
    // count.bucket is a string array of bucket values
    // e.g., [true, false] (true label, predicted label)
    const [featA, featB] = count.bucket;
    // count.count is the number of samples
    const nSamples = count.count;
    entryData.push([
      cateMap.get(featA) || 0,
      cateMap.get(featB) || 0,
      nSamples,
    ]);

    // Count.samples is a list of numbers, or undefined for legacy SDK
    if (count.samples) {
      samples.push(count.samples);
    }
  }

  // Total samples for each true label
  const entryDataSum: { [category: number]: number } = {};

  /**
   * `entryData` and `entryRatioData` are arrays of entries (arrays of length 3)
   * each entry is [<true_label>, <predicted_label>, <value>]
   * where <value> is sample count (integer) in `entryData`
   * and ratio (float) in `entryRatioData`, respectively
   */
  entryData.forEach((entry) => {
    const [trueLabel, , count] = entry;
    entryDataSum[trueLabel] = (entryDataSum[trueLabel] || 0) + count;
  });
  const entryRatioData = entryData.map((entry) => {
    const [trueLabel, predictedLabel, count] = entry;

    return [
      trueLabel,
      predictedLabel,
      +(count / entryDataSum[trueLabel]).toFixed(3),
    ];
  });

  // Get array min and max
  let min = Infinity;
  let minRatio = Infinity;
  let max = 0;
  let maxRatio = 0;

  for (let i = 0; i < entryData.length; i++) {
    const [, , nSamples] = entryData[i];
    const [, , ratio] = entryRatioData[i];
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
      name: analysis.comboFeatures[1],
      nameLocation: "middle",
      nameTextStyle: {
        padding: [1, 0, 0, 0],
        fontSize: 10,
        fontWeight: "bold",
      },
    },
    yAxis: {
      type: "category",
      data: categories,
      splitArea: {
        show: true,
      },
      name: analysis.comboFeatures[0],
      nameTextStyle: {
        fontWeight: "bold",
        fontSize: 10,
      },
    },
    visualMap: {
      show: false,
      min: minRatio,
      max: maxRatio,
    },
    series: [
      {
        name: analysis.featureName,
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
    <Col span={colSpan} key={title}>
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
              onEntryClick(samples, system.system_id, dataIndex, systemIndex);
            }
          },
        }}
      />
    </Col>
  );
}
