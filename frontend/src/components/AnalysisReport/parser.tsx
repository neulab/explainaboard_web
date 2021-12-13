import { LabelElement } from "./types";

export function parseLabels(labels: Array<LabelElement[]>) {
  const bucketNames: string[] = [];
  const values: number[] = [];
  const numbersOfSamples: number[] = [];
  const confidenceScores: [number, number][] = [];

  // Can be improved by redefining schema.
  let metricName = "";

  for (const labelArr of labels) {
    // For text classification, labelArr always has length 1
    const label = labelArr[0];
    const bucketName = label["bucket_name"][0];
    const value = parseFloat(label["value"]);
    const nSamples = label["n_samples"];
    const confidenceScoreLow = parseFloat(label["confidence_score_low"]);
    const confidenceScoreUp = parseFloat(label["confidence_score_up"]);
    metricName = label["metric_name"];
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
