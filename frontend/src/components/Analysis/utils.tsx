import {
  BucketIntervals,
  ResultFineGrainedParsed,
  SystemInfoFeature,
} from "./types";
import {
  AnalysisCase,
  SingleAnalysis,
  AnalysisResult,
  BucketPerformance,
  Performance,
} from "../../clients/openapi";
import { SystemModel } from "../../models";

export function initParsedResult(
  metricName: string,
  featureName: string,
  featureDescription: string
): ResultFineGrainedParsed {
  const bucketIntervals: BucketIntervals = {
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY,
    bounds: [],
    updated: false,
  };
  const bucketNames: string[] = [];
  const bucketType = "";
  const performances: ResultFineGrainedParsed["performances"] = [];
  const cases: ResultFineGrainedParsed["cases"] = [];
  const numbersOfSamples: ResultFineGrainedParsed["numbersOfSamples"] = [];
  return {
    metricName,
    featureName,
    featureDescription,
    bucketType,
    bucketNames,
    bucketIntervals,
    numbersOfSamples,
    performances,
    cases,
  };
}

function formatName(name: number | string): string {
  if (typeof name === "string") {
    return name;
  } else if (Number.isNaN(Number(name)) || Number.isInteger(Number(name))) {
    return name.toString();
  } else {
    return name.toFixed(2);
  }
}

export function formatBucketName(
  unformattedName: Array<number | string>
): string {
  const bucketInterval = unformattedName.map((name) => formatName(name));
  if (bucketInterval.length === 1) {
    return `${bucketInterval[0]}\n\n`;
  } else if (bucketInterval.length === 2) {
    return `${bucketInterval[0]}\n|\n${bucketInterval[1]}`;
  } else {
    throw new Error("cannot handle bucket intervals greater than 2 elements");
  }
}

// Parses features according to task type.
export function parse(
  systemID: string,
  task: string,
  bucketPerformances: AnalysisResult[],
  bucketType: string,
  featureName: string,
  featureDescription: string
) {
  const parsedResult: { [metricName: string]: ResultFineGrainedParsed } = {};

  // Sort by the correct bucket interval order
  bucketPerformances.sort((a, b) => {
    if (a.bucket_interval[0] > b.bucket_interval[0]) {
      return 1;
    } else if (a.bucket_interval[0] < b.bucket_interval[0]) {
      return -1;
    } else {
      return 0;
    }
  });

  for (const bucketPerformance of bucketPerformances) {
    /* performances will have length > 1 when there exist multiple metrics.
    E.g., Accuracy, F1Score
    */

    // Convert the string representation of the bucket interval to numbers
    const bucketName = formatBucketName(bucketPerformance.bucket_interval);

    for (const performance of bucketPerformance["performances"]) {
      const nSamples = bucketPerformance.n_samples;
      const metricName = performance.metric_name;
      if (!(metricName in parsedResult)) {
        parsedResult[metricName] = initParsedResult(
          metricName,
          featureName,
          featureDescription
        );
      }
      const result = parsedResult[metricName];
      result.metricName = performance.metric_name;
      result.performances.push(performance);
      result.cases.push(bucketPerformance.bucket_samples);
      result.bucketNames.push(bucketName);
      result.numbersOfSamples.push(nSamples);
      result.bucketType = bucketType;
      if (!(typeof bucketPerformance.bucket_interval[0] === typeof "")) {
        const numInterval = bucketPerformance.bucket_interval as number[];
        result.bucketIntervals.min = Math.min(
          result.bucketIntervals.min,
          ...numInterval
        );
        result.bucketIntervals.max = Math.max(
          result.bucketIntervals.max,
          ...numInterval
        );
        result.bucketIntervals.bounds.push(numInterval[numInterval.length - 1]);
      }
      // bucketInfo are feature invariant across different metrics
      result.featureName = featureName;
    }
  }
  return parsedResult;
}

// TODO(gneubig): can probably be deleted
// export function findFeature(
//   features: { [key: string]: unknown },
//   name: string
// ): SystemInfoFeature | undefined {
//   if (name in features) {
//     return features[name] as SystemInfoFeature;
//   } else {
//     for (const key in features) {
//       if (typeof features[key] === "object" && features[key] !== null) {
//         const val = findFeature(
//           features[key] as { [key: string]: unknown },
//           name
//         );
//         if (val !== undefined) {
//           return val;
//         }
//       }
//     }
//   }
//   return undefined;
// }

export function parseFineGrainedResults(
  task: string,
  systems: SystemModel[],
  singleAnalyses: SingleAnalysis[]
): { [metric: string]: { [feature: string]: ResultFineGrainedParsed[] } } {
  /**
   * Takes in a task, metric names, and systems, and returns fine-grained evaluation
   * results that can be accessed in the format:
   * > value[metric_name : string][analysis_name : int][system_id : int]
   */

  const parsedResults: {
    [metric: string]: {
      [analysis: string]: ResultFineGrainedParsed[];
    };
  } = {};

  // Loop through each system analysis and parse
  for (let sys_i = 0; sys_i < systems.length; sys_i++) {
    const system = systems[sys_i];
    const singleAnalysis: SingleAnalysis = singleAnalyses[sys_i];

    for (
      let lev_i = 0;
      lev_i < singleAnalysis.analysis_results.length;
      lev_i++
    ) {
      const analysisLevel = system.system_info.analysis_levels[lev_i];
      const resultLevel = singleAnalysis.analysis_results[lev_i];
      for (let anl_i = 0; anl_i < resultLevel.length; anl_i++) {
        const myResult = resultLevel[anl_i];
        const myAnalysis = analysisLevel.analyses[anl_i];
        // Skip non-bucketing analyses for now
        if (myResult.cls_name !== "BucketAnalysisResult") {
          continue;
        }
        const analysisName = myResult.name;
        const analysisBuckets: BucketPerformance[] =
          myResult["bucket_performances"];
        const analysisDescription = myAnalysis.description;
        const bucketType = myAnalysis["method"];

        const metricToParsed: { [metric: string]: ResultFineGrainedParsed } =
          parse(
            system.system_id,
            task,
            analysisBuckets,
            bucketType,
            analysisName,
            analysisDescription
          );
        for (const [metric, singleResult] of Object.entries(metricToParsed)) {
          if (!(metric in parsedResults)) {
            parsedResults[metric] = {};
          }
          if (!(analysisName in parsedResults[metric])) {
            parsedResults[metric][analysisName] = [];
          }
          parsedResults[metric][analysisName].push(singleResult);
        }
      }
    }
  }
  // Sanity check to make sure that whatever features were found were found for all systems
  for (const [metric, metricResults] of Object.entries(parsedResults)) {
    for (const [feature, metricFeatureResults] of Object.entries(
      metricResults
    )) {
      if (metricFeatureResults.length !== systems.length) {
        throw new Error(
          `found metric=${metric}, feature=${feature} for some but not all systems`
        );
      }
    }
  }
  return parsedResults;
}

export function compareBucketOfSamples(
  caseA: AnalysisCase,
  caseB: AnalysisCase
) {
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

export function getOverallMap(overallResults: Performance[][]): {
  [name: string]: Performance;
} {
  const overallMap: { [name: string]: Performance } = {};
  for (const overallLevel of overallResults) {
    for (const overallResult of overallLevel) {
      overallMap[overallResult.metric_name] = overallResult;
    }
  }
  return overallMap;
}
