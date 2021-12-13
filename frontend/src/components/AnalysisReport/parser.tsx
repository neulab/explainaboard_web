import { FineGrainedElement } from "./types";

export function parse(fineGrainedElements: Array<FineGrainedElement[]>) {
  const bucketNames: string[] = [];
  const values: number[] = [];
  const numbersOfSamples: number[] = [];
  const confidenceScores: [number, number][] = [];

  // Can be improved by redefining schema.
  let metricName = "";

  for (const fineGrainedArr of fineGrainedElements) {
    // For text classification, fineGrainedArr always has length 1
    const fineGrainedElement = fineGrainedArr[0];
    const bucketName = fineGrainedElement["bucket_name"][0].toString();
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
