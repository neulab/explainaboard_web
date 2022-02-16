import { FineGrainedElement } from "./types";

function formatName(name: string) {
  if (Number.isNaN(Number(name))) {
    return name;
  } else if (Number.isInteger(Number(name))) {
    return Number.parseInt(name);
  } else {
    return Number.parseFloat(name).toFixed(2);
  }
}

// Parses a fineGrainedElements according to its task type.
export function parse(
  task: string,
  fineGrainedElements: Array<FineGrainedElement[]>
) {
  const bucketNames: string[] = [];
  const values: number[] = [];
  const numbersOfSamples: number[] = [];
  const confidenceScores: Array<[number, number]> = [];
  const bucketsOfSamples = [];

  let metricName = "";

  for (let i = 0; i < fineGrainedElements.length; i++) {
    // For text classification, fineGrainedElements[i] always has length 1
    // TODO: handle cases where length > 1
    const fineGrainedElement = fineGrainedElements[i][0];

    bucketsOfSamples.push(fineGrainedElement.bucket_samples);

    const bucketNameArray = fineGrainedElement.bucket_name;
    let bucketName = "";
    switch (bucketNameArray.length) {
      case 1: {
        // Add two new lines so its text height is consistent with case 2.
        // This allows the charts to have equal heights
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

    const value = parseFloat(fineGrainedElement.value);
    const nSamples = fineGrainedElement.n_samples;
    const confidenceScoreLow = parseFloat(
      fineGrainedElement.confidence_score_low
    );
    const confidenceScoreHigh = parseFloat(
      fineGrainedElement.confidence_score_up
    );
    metricName = fineGrainedElement.metric_name;
    bucketNames.push(bucketName);
    values.push(value);
    numbersOfSamples.push(nSamples);
    if (confidenceScoreLow !== 0 && confidenceScoreHigh !== 0) {
      confidenceScores.push([confidenceScoreLow, confidenceScoreHigh]);
    }
  }

  return {
    task,
    metricName,
    bucketNames,
    bucketsOfSamples,
    values,
    numbersOfSamples,
    confidenceScores,
  };
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