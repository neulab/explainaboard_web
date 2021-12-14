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
  const confidenceScores: [number, number][] = [];

  // Can be improved by redefining schema.
  let metricName = "";

  for (let i = 0; i < fineGrainedElements.length; i++) {
    // For text classification, fineGrainedElements[i] always has length 1
    const fineGrainedElement = fineGrainedElements[i][0];
    let bucketName = fineGrainedElement["bucket_name"][0];
    if (bucketNameFormat === "range") {
      let bucketNameEnd = "inf";
      if (i + 1 < fineGrainedElements.length) {
        const nextBucketName = fineGrainedElements[i + 1][0]["bucket_name"][0];
        if (typeof nextBucketName === "number") {
          bucketNameEnd = (nextBucketName - 1).toString();
        }
      }
      bucketName = `${bucketName}\n|\n${bucketNameEnd}`;
    } else {
      bucketName = bucketName.toString();
    }
    const value = parseFloat(fineGrainedElement["value"]);
    const nSamples = fineGrainedElement["n_samples"];
    const confidenceScoreLow = parseFloat(
      fineGrainedElement["confidence_score_low"]
    );
    const confidenceScoreUp = parseFloat(
      fineGrainedElement["confidence_score_up"]
    );
    metricName = fineGrainedElement["metric_name"];
    bucketNames.push(bucketName);
    values.push(value);
    numbersOfSamples.push(nSamples);
    confidenceScores.push([confidenceScoreLow, confidenceScoreUp]);
  }

  return {
    metricName: metricName,
    bucketNames: bucketNames,
    values: values,
    numbersOfSamples: numbersOfSamples,
    confidenceScores: confidenceScores,
  };
}
