import {
  BucketIntervals,
  ResultFineGrainedParsed,
  SystemInfoFeature,
} from "./types";
import {
  BucketCase,
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
  featureName: string,
  bucketInfo: SystemInfoFeature["bucket_info"]
) {
  const parsedResult: { [metricName: string]: ResultFineGrainedParsed } = {};
  for (const metricName of metricNames) {
    const bucketNames: ResultFineGrainedParsed["bucketNames"] = [];
    const bucketIntervals: BucketIntervals = {
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY,
      bounds: [],
      updated: false,
    };
    const performances: ResultFineGrainedParsed["performances"] = [];
    const cases: ResultFineGrainedParsed["cases"] = [];
    const numbersOfSamples: ResultFineGrainedParsed["numbersOfSamples"] = [];
    parsedResult[metricName] = {
      featureDescription: description,
      featureName,
      metricName,
      bucketInfo,
      bucketIntervals,
      bucketNames,
      numbersOfSamples,
      performances,
      cases,
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

    // Convert the string representation of the bucket interval to numbers
    const bucketInterval = bucketPerformance.bucket_name.map((name) =>
      formatName(name)
    );
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

    for (const performance of bucketPerformance["performances"]) {
      const nSamples = bucketPerformance.n_samples;
      const metricName = performance.metric_name;
      const result = parsedResult[metricName];
      result.metricName = performance.metric_name;
      result.performances.push(performance);
      result.cases.push(bucketPerformance.bucket_samples);
      result.bucketNames.push(bucketName);
      result.numbersOfSamples.push(nSamples);
      result.bucketIntervals.min = Math.min(
        result.bucketIntervals.min,
        ...bucketInterval
      );
      result.bucketIntervals.max = Math.max(
        result.bucketIntervals.max,
        ...bucketInterval
      );
      result.bucketIntervals.bounds.push(
        bucketInterval[bucketInterval.length - 1]
      );
      // bucketInfo are feature invariant across different metrics
      result.bucketInfo = bucketInfo;
      result.featureName = featureName;
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
): { [key: string]: ResultFineGrainedParsed[][] } {
  /**
   * Takes in a task, metric names, and systems, and returns fine-grained evaluation
   * results that can be accessed in the format:
   * > value[metric_name : string][system_id : int][feature_id : int]
   */

  const metricToSystemAnalysesParsed: {
    [key: string]: ResultFineGrainedParsed[][];
  } = {};

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

    for (const featureName of systemActiveFeatures) {
      const feature = singleAnalysis[featureName];
      const systemInfoFeature = findFeature(systemInfoFeatures, featureName);
      if (systemInfoFeature !== undefined) {
        const bucketInfo = systemInfoFeature["bucket_info"];
        const description = systemInfoFeature["description"] || featureName;

        const metricToResultFineGrainedParsed = parse(
          systemID,
          task,
          metricNames,
          description,
          feature,
          featureName,
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
      metricToSystemAnalysesParsed[metric].push(resultsFineGrainedParsed);
    }
  }
  return metricToSystemAnalysesParsed;
}

export function compareBucketOfSamples(caseA: BucketCase, caseB: BucketCase) {
  // TODO(gneubig): this sorts only by sample ID
  const a = caseA["sample_id"];
  const b = caseB["sample_id"];
  const numA = Number(a);
  const numB = Number(b);
  if (Number.isInteger(numA) && Number.isInteger(numB)) {
    return numA - numB;
  }
  if (a > b) {
    return 1;
  } else if (a < b) {
    return -1;
  } else {
    return 0;
  }
}

export function valuesToIntervals(values: number[]): number[][] {
  return values
    .slice(0, values.length - 1)
    .map((value, index) => [value, values[index + 1]]);
}
