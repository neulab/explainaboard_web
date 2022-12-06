import { BucketIntervals, ResultFineGrainedParsed } from "./types";
import {
  AnalysisCase,
  SingleAnalysis,
  AnalysisResult,
  MetricResult,
} from "../../clients/openapi";

export function initParsedResult(
  metricName: string,
  featureName: string,
  featureDescription: string,
  levelName: string
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
  const comboCounts: ResultFineGrainedParsed["comboCounts"] = [];
  const comboFeatures: ResultFineGrainedParsed["comboFeatures"] = [];
  const cases: ResultFineGrainedParsed["cases"] = [];
  const numbersOfSamples: ResultFineGrainedParsed["numbersOfSamples"] = [];
  return {
    metricName,
    featureName,
    featureDescription,
    levelName,
    bucketType,
    bucketNames,
    bucketIntervals,
    numbersOfSamples,
    performances,
    comboCounts,
    comboFeatures,
    cases,
  };
}

function formatName(name: number): string {
  if (Number.isNaN(Number(name)) || Number.isInteger(Number(name))) {
    return name.toString();
  } else {
    return name.toFixed(2);
  }
}

export function formatBucketName(unformattedName: Array<number>): string {
  const bucketInterval = unformattedName.map((name) => formatName(name));
  if (bucketInterval.length === 1) {
    return `${bucketInterval[0]}\n\n`;
  } else if (bucketInterval.length === 2) {
    return `${bucketInterval[0]}\n|\n${bucketInterval[1]}`;
  } else {
    throw new Error("cannot handle bucket intervals greater than 2 elements");
  }
}

export function parseComboCountFeatures(
  comboCounts: AnalysisResult[],
  features: string[],
  levelName: string,
  analysisName: string,
  featureDescription: string
) {
  const parsedResult: ResultFineGrainedParsed = initParsedResult(
    "", // we don't need a metric name for combo count analyses
    analysisName,
    featureDescription,
    levelName
  );

  parsedResult.comboCounts = comboCounts.map((countArr) => {
    return {
      bucket: countArr.features,
      count: countArr.sample_count,
      samples: countArr.sample_ids,
    };
  });
  parsedResult.comboFeatures = features;

  return parsedResult;
}

/**
 * Parses features according to task type.
 */
export function parseBucketAnalysisFeatures(
  bucketPerformances: AnalysisResult[],
  bucketType: string,
  levelName: string,
  featureName: string,
  featureDescription: string
) {
  const parsedResult: { [metricName: string]: ResultFineGrainedParsed } = {};

  // Sort by the correct bucket interval order
  bucketPerformances.sort((a, b) => {
    if (a.bucket_name != null) {
      if (a.bucket_name > b.bucket_name) {
        return 1;
      } else if (a.bucket_name < b.bucket_name) {
        return -1;
      } else {
        return 0;
      }
    } else {
      if (a.bucket_interval[0] > b.bucket_interval[0]) {
        return 1;
      } else if (a.bucket_interval[0] < b.bucket_interval[0]) {
        return -1;
      } else {
        return 0;
      }
    }
  });

  for (const bucketPerformance of bucketPerformances) {
    /* performances will have length > 1 when there exist multiple metrics.
    E.g., Accuracy, F1Score
    */

    // Convert the string representation of the bucket interval to numbers
    const bucketName =
      bucketPerformance.bucket_name ||
      formatBucketName(bucketPerformance.bucket_interval);
    for (const [metricName, performance] of Object.entries(
      bucketPerformance.results
    )) {
      const nSamples = bucketPerformance.n_samples;
      if (!(metricName in parsedResult)) {
        parsedResult[metricName] = initParsedResult(
          metricName,
          featureName,
          featureDescription,
          levelName
        );
      }
      const result = parsedResult[metricName];
      result.performances.push(performance as MetricResult);
      result.cases.push(bucketPerformance.bucket_samples);
      result.bucketNames.push(bucketName);
      result.numbersOfSamples.push(nSamples);
      result.bucketType = bucketType;
      if (bucketPerformance.bucket_interval != null) {
        const numInterval = bucketPerformance.bucket_interval;
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
    }
  }
  return parsedResult;
}

/**
 * Takes in a task, metric names, and systems, and returns fine-grained evaluation
 * results that can be accessed in the format:
 * > value[metric_name : string][analysis_name : int][system_id : int]
 */
export function parseFineGrainedResults(singleAnalyses: SingleAnalysis[]): {
  [metric: string]: { [feature: string]: ResultFineGrainedParsed[] };
} {
  const parsedResults: {
    [metric: string]: {
      [analysis: string]: ResultFineGrainedParsed[];
    };
  } = {};
  const parsedComboAnalyses: ResultFineGrainedParsed[] = [];

  // Loop through each system analysis and parse
  for (const { system_info, analysis_results } of singleAnalyses) {
    for (const myResult of analysis_results) {
      // Find the analysis setting for the system analysis
      // Analysis results may not be in the same order or size as analysis settings
      const myAnalysis = system_info.analyses.find((analysis) => {
        if (myResult.details.cls_name === "BucketAnalysisDetails") {
          return (
            analysis.cls_name === "BucketAnalysis" &&
            analysis.feature === myResult.name &&
            analysis.level === myResult.level
          );
        } else if (myResult.details.cls_name === "ComboCountAnalysisDetails") {
          return (
            analysis.cls_name === "ComboCountAnalysis" &&
            analysis.level === myResult.level &&
            analysis.features === myResult.features
          );
        } else {
          console.error(`${myResult.details.cls_name} not supported`);
          return false;
        }
      });

      const analysisName = myResult.name;
      const analysisDescription = myAnalysis?.description || analysisName;
      const bucketType = myAnalysis ? myAnalysis["method"] : "";

      if (myResult.details.cls_name === "BucketAnalysisDetails") {
        const metricToParsed = parseBucketAnalysisFeatures(
          myResult.details.bucket_performances,
          bucketType,
          myResult.level,
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
      } else if (myResult.details.cls_name === "ComboCountAnalysisDetails") {
        const parsedComboAnalysis = parseComboCountFeatures(
          myResult.details.combo_occurrences,
          myResult.details.features,
          myResult.level,
          analysisName,
          analysisDescription
        );
        parsedComboAnalyses.push(parsedComboAnalysis);
      } else {
        console.error(`${myResult.details.cls_name} not supported`);
      }
    }
  }

  // Add combo count analysis to all metrics
  for (const metric of Object.keys(parsedResults)) {
    for (const comboAnalysis of parsedComboAnalyses) {
      if (!(comboAnalysis.featureName in parsedResults[metric])) {
        parsedResults[metric][comboAnalysis.featureName] = [];
      }
      parsedResults[metric][comboAnalysis.featureName].push(comboAnalysis);
    }
  }

  // Sanity check to make sure that whatever features were found were found for all systems
  for (const [metric, metricResults] of Object.entries(parsedResults)) {
    for (const [feature, metricFeatureResults] of Object.entries(
      metricResults
    )) {
      if (metricFeatureResults.length !== singleAnalyses.length) {
        throw new Error(
          `found metric=${metric}, feature=${feature} for some but not all systems`
        );
      }
    }
  }
  return parsedResults;
}

export function compareBucketOfCases(caseA: AnalysisCase, caseB: AnalysisCase) {
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

export function getOverallMap(overallResults: {
  [level: string]: { [metric_name: string]: MetricResult };
}): {
  [name: string]: MetricResult;
} {
  const overallMap: { [name: string]: MetricResult } = {};
  for (const overallLevel of Object.values(overallResults)) {
    for (const [metric_name, overallResult] of Object.entries(overallLevel)) {
      overallMap[metric_name] = overallResult;
    }
  }
  return overallMap;
}

export function unwrapValue(perf: MetricResult): number {
  if (perf.values.score) {
    return perf.values.score.value;
  }
  return -1;
}

export function unwrapConfidence(perf: MetricResult): [number, number] {
  if (perf.values.score_ci) {
    return [perf.values.score_ci.low, perf.values.score_ci.high];
  }
  return [-1, -1];
}

export function hasDuplicate(strings: string[]): boolean {
  const distinctSet = new Set(strings);
  return distinctSet.size !== strings.length;
}
