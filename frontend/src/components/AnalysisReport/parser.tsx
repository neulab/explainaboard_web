import { FineGrainedElement } from "./types";

interface Option {
  bucketName: {
    format: string;
  };
}

const defaultOption = { bucketName: { format: "none" } };

export function parse(
  fineGrainedElements: Array<FineGrainedElement[]>,
  option: Option = defaultOption
) {
  const bucketNameFormat = option.bucketName.format;
  const bucketNames: string[] = [];
  const values: number[] = [];
  const numbersOfSamples: number[] = [];
  const confidenceScores: Array<[number, number]> = [];
  const bucketsOfSamples: Array<number[]> = [];

  // Can be improved by redefining schema.
  let metricName = "";

  for (let i = 0; i < fineGrainedElements.length; i++) {
    // For text classification, fineGrainedElements[i] always has length 1
    const fineGrainedElement = fineGrainedElements[i][0];

    const bucketSamples = fineGrainedElement.bucket_samples.map(
      (bucketSample) => {
        // currently predicted_label, text, true_label share the same system output ids, so any works
        // the id is the first element and has type number
        return bucketSample.predicted_label[0] as number;
      }
    );
    bucketsOfSamples.push(bucketSamples);

    let bucketName = fineGrainedElement.bucket_name[0];
    if (bucketNameFormat === "range") {
      let bucketNameEnd = "inf";
      if (i + 1 < fineGrainedElements.length) {
        const nextBucketName = fineGrainedElements[i + 1][0].bucket_name[0];
        if (typeof nextBucketName === "number") {
          bucketNameEnd = (nextBucketName - 1).toString();
        }
      }
      bucketName = `${bucketName}\n|\n${bucketNameEnd}`;
    } else {
      // Add two new lines so it is consistent with format "range". The charts will have same height
      bucketName = `${bucketName.toString()}\n\n`;
    }
    const value = parseFloat(fineGrainedElement.value);
    const nSamples = fineGrainedElement.n_samples;
    const confidenceScoreLow = parseFloat(
      fineGrainedElement.confidence_score_low
    );
    const confidenceScoreUp = parseFloat(
      fineGrainedElement.confidence_score_up
    );
    metricName = fineGrainedElement.metric_name;
    bucketNames.push(bucketName);
    values.push(value);
    numbersOfSamples.push(nSamples);
    confidenceScores.push([confidenceScoreLow, confidenceScoreUp]);
  }

  return {
    metricName: metricName,
    bucketNames: bucketNames,
    bucketsOfSamples: bucketsOfSamples,
    values: values,
    numbersOfSamples: numbersOfSamples,
    confidenceScores: confidenceScores,
  };
}
