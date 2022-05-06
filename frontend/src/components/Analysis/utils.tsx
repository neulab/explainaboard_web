import {
  MetricToSystemAnalysesParsed,
  ResultFineGrainedParsed,
  SystemAnalysisParsed,
  SystemInfoFeature,
} from "./types";
import {
  BucketPerformance,
  SingleAnalysisReturn,
  SystemAnalysesReturn,
} from "../../clients/openapi";
import { SystemModel } from "../../models";

function formatName(name: string): number {
  if (Number.isNaN(Number(name))) {
    // TODO error handling
    return 0;
  } else if (Number.isInteger(Number(name))) {
    return Number.parseInt(name);
  } else {
    return Number.parseFloat(Number.parseFloat(name).toFixed(2));
  }
}

// Parses features according to task type.
export function parse(
  systemID: string,
  task: string,
  metricNames: string[],
  description: string,
  feature: { [bucketInterval: string]: BucketPerformance },
  featureKey: string,
  bucketInfo: SystemInfoFeature["bucket_info"]
) {
  const decimalPlaces = 3;
  const parsedResult: { [metricName: string]: ResultFineGrainedParsed } = {};
  for (const metricName of metricNames) {
    const bucketNames: ResultFineGrainedParsed["bucketNames"] = [];
    const bucketMin: ResultFineGrainedParsed["bucketMin"] =
      Number.POSITIVE_INFINITY;
    const bucketMax: ResultFineGrainedParsed["bucketMax"] =
      Number.NEGATIVE_INFINITY;
    const bucketStep: ResultFineGrainedParsed["bucketStep"] = 1;
    const bucketRightBounds: ResultFineGrainedParsed["bucketRightBounds"] = [];
    const bucketIntervals: ResultFineGrainedParsed["bucketIntervals"] = [];
    const values: ResultFineGrainedParsed["values"] = [];
    const numbersOfSamples: ResultFineGrainedParsed["numbersOfSamples"] = [];
    const confidenceScores: ResultFineGrainedParsed["confidenceScores"] = [];
    const bucketsOfSamples: ResultFineGrainedParsed["bucketsOfSamples"] = [];
    parsedResult[metricName] = {
      systemID,
      task,
      description,
      featureKey,
      metricName,
      bucketIntervals,
      bucketInfo,
      bucketMin,
      bucketMax,
      bucketStep,
      bucketRightBounds,
      bucketNames,
      values,
      numbersOfSamples,
      confidenceScores,
      bucketsOfSamples,
    };
  }
  const bucketPerformances: BucketPerformance[] = [];
  for (const bucketPerformance of Object.values(feature)) {
    bucketPerformances.push(bucketPerformance);
  }
  // Sort by the correct bucket interval order
  bucketPerformances.sort((a, b) => {
    return (
      Number.parseFloat(a.bucket_name[0]) - Number.parseFloat(b.bucket_name[0])
    );
  });

  for (const bucketPerformance of bucketPerformances) {
    /* performances will have length > 1 when there exist multiple metrics.
    E.g., Accuracy, F1Score
    */

    for (const performance of bucketPerformance["performances"]) {
      // The bucket interval
      const bucketNameArray = bucketPerformance["bucket_name"];
      const bucketInterval = bucketNameArray.map((name) => formatName(name));
      let bucketName = "";
      switch (bucketInterval.length) {
        case 1: {
          /*Add two new lines so its text height is consistent with case 2.
          This allows the charts to have equal heights
          */
          bucketName = `${bucketInterval[0].toString()}\n\n`;
          break;
        }
        case 2: {
          bucketName = bucketInterval
            .map((bound) => bound.toString())
            .join("\n|\n");
          break;
        }
        default: {
          // TODO: handle cases hwere length > 2
          break;
        }
      }

      const value = performance.value;
      const nSamples = bucketPerformance.n_samples;
      const confidenceScoreLow = performance.confidence_score_low;
      const confidenceScoreHigh = performance.confidence_score_high;
      const metricName = performance.metric_name;
      const resultFineGrainedParsed = parsedResult[metricName];
      resultFineGrainedParsed.metricName = metricName;
      resultFineGrainedParsed.bucketsOfSamples.push(
        bucketPerformance.bucket_samples
      );
      resultFineGrainedParsed.bucketNames.push(bucketName);
      resultFineGrainedParsed.bucketIntervals.push(bucketInterval);
      resultFineGrainedParsed.values.push(
        Number.parseFloat(value.toFixed(decimalPlaces))
      );
      resultFineGrainedParsed.numbersOfSamples.push(nSamples);
      if (
        confidenceScoreLow !== undefined &&
        confidenceScoreHigh !== undefined
      ) {
        resultFineGrainedParsed.confidenceScores.push([
          Number.parseFloat(confidenceScoreLow.toFixed(decimalPlaces)),
          Number.parseFloat(confidenceScoreHigh.toFixed(decimalPlaces)),
        ]);
      }
      resultFineGrainedParsed.bucketMin = Math.min(
        resultFineGrainedParsed.bucketMin,
        ...bucketInterval
      );
      resultFineGrainedParsed.bucketMax = Math.max(
        resultFineGrainedParsed.bucketMax,
        ...bucketInterval
      );
      if (
        resultFineGrainedParsed.bucketMax - resultFineGrainedParsed.bucketMin <=
        1
      ) {
        resultFineGrainedParsed.bucketStep = 0.01;
      } else {
        resultFineGrainedParsed.bucketStep = 1;
      }
      resultFineGrainedParsed.bucketRightBounds.push(
        bucketInterval[bucketInterval.length - 1]
      );
      // bucketInfo are feature invariant across different metrics
      resultFineGrainedParsed.bucketInfo = bucketInfo;
      resultFineGrainedParsed.featureKey = featureKey;
    }
  }
  return parsedResult;
}

export function findFeature(
  features: { [key: string]: unknown },
  name: string
): SystemInfoFeature | undefined {
  if (name in features) {
    return features[name] as SystemInfoFeature;
  } else {
    for (const key in features) {
      if (typeof features[key] === "object" && features[key] !== null) {
        const val = findFeature(
          features[key] as { [key: string]: unknown },
          name
        );
        if (val !== undefined) {
          return val;
        }
      }
    }
  }
  return undefined;
}

export function getMetricToSystemAnalysesParsed(
  task: string,
  metricNames: string[],
  systems: SystemModel[],
  singleAnalyses: SystemAnalysesReturn["single_analyses"]
): MetricToSystemAnalysesParsed {
  const metricToSystemAnalysesParsed: MetricToSystemAnalysesParsed = {};

  for (const metricName of metricNames) {
    // Array to store every parsed system analysis
    metricToSystemAnalysesParsed[metricName] = [];
  }

  // Loop through each system analysis and parse
  for (const system of systems) {
    const systemID = system.system_id;
    const systemInfoFeatures = system.system_info.features;
    const systemActiveFeatures = system.active_features.sort();
    const singleAnalysis: SingleAnalysisReturn = singleAnalyses[systemID];
    const metricToParsedInfo: {
      [key: string]: {
        // the parsed fine-grained results, used for visualization
        resultsFineGrainedParsed: ResultFineGrainedParsed[];
      };
    } = {};
    for (const metricName of metricNames) {
      metricToParsedInfo[metricName] = {
        resultsFineGrainedParsed: [],
      };
    }

    const featureKeyToDescription: SystemAnalysisParsed["featureKeyToDescription"] =
      {};

    for (const featureKey of systemActiveFeatures) {
      const feature = singleAnalysis[featureKey];
      const systemInfoFeature = findFeature(systemInfoFeatures, featureKey);
      if (systemInfoFeature !== undefined) {
        const bucketInfo = systemInfoFeature["bucket_info"];
        const description = systemInfoFeature["description"] || featureKey;

        const metricToResultFineGrainedParsed = parse(
          systemID,
          task,
          metricNames,
          description,
          feature,
          featureKey,
          bucketInfo
        );
        for (const [metric, resultFineGrainedParsed] of Object.entries(
          metricToResultFineGrainedParsed
        )) {
          metricToParsedInfo[metric].resultsFineGrainedParsed.push(
            resultFineGrainedParsed
          );
        }
      }
    }

    for (const [metric, parsedInfo] of Object.entries(metricToParsedInfo)) {
      const { resultsFineGrainedParsed } = parsedInfo;
      metricToSystemAnalysesParsed[metric].push({
        featureKeyToDescription,
        resultsFineGrainedParsed,
      });
    }
  }
  return metricToSystemAnalysesParsed;
}

export function compareBucketOfSamples(
  // TODO NER types
  a: string,
  b: string
) {
  const numA = Number(a);
  const numB = Number(b);
  if (Number.isInteger(numA) && Number.isInteger(numB)) {
    return numA - numB;
  } else if (typeof a === "string" && typeof a === "string") {
    if (a > b) {
      return 1;
    } else if (a < b) {
      return -1;
    }
  }
  return 0;
}

export function valuesToIntervals(values: number[]): number[][] {
  return values
    .slice(0, values.length - 1)
    .map((value, index) => [value, values[index + 1]]);
}

// export function timeout(ms: number) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }
