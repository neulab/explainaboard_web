import { ResultFineGrainedParsed } from "./types";
import { BucketPerformance } from "../../../clients/openapi";

function formatName(name: string): number {
  if (Number.isNaN(Number(name))) {
    // TODO error handling
    return 0;
  } else if (Number.isInteger(Number(name))) {
    return Number.parseInt(name);
  } else {
    return Number.parseFloat(name);
  }
}

// Parses features according to task type.
export function parse(
  systemID: string,
  task: string,
  metricNames: string[],
  description: string,
  feature: { [key: string]: BucketPerformance }
) {
  const decimalPlaces = 3;
  const parsedResult: { [key: string]: ResultFineGrainedParsed } = {};
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
      metricName,
      bucketIntervals,
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
            .map((bound) => bound.toFixed(2))
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
    }
  }
  return parsedResult;
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
