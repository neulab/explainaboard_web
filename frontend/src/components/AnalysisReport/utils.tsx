import { ResultFineGrainedParsed } from "./types";
import { BucketPerformance } from "../../clients/openapi";

function formatName(name: string) {
  if (Number.isNaN(Number(name))) {
    return name;
  } else if (Number.isInteger(Number(name))) {
    return Number.parseInt(name);
  } else {
    return Number.parseFloat(name).toFixed(2);
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
    const values: ResultFineGrainedParsed["values"] = [];
    const numbersOfSamples: ResultFineGrainedParsed["numbersOfSamples"] = [];
    const confidenceScores: ResultFineGrainedParsed["confidenceScores"] = [];
    const bucketsOfSamples: ResultFineGrainedParsed["bucketsOfSamples"] = [];
    parsedResult[metricName] = {
      systemID,
      task,
      description,
      metricName,
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
      let bucketName = "";
      switch (bucketNameArray.length) {
        case 1: {
          /*Add two new lines so its text height is consistent with case 2.
          This allows the charts to have equal heights
          */
          const name = bucketNameArray[0] as string;
          bucketName = `${formatName(name).toString()}\n\n`;
          break;
        }
        case 2: {
          const name1 = bucketNameArray[0] as string;
          const name2 = bucketNameArray[1] as string;
          bucketName = `${formatName(name1).toString()}\n|\n${formatName(
            name2
          ).toString()}`;
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
