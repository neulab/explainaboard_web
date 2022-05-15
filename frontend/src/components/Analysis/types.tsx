// interface modified from https://app.quicktype.io/

import { BucketCase } from "../../clients/openapi";

export interface ResultFineGrainedParsed {
  systemID: string;
  task: string;
  featureName: string;
  description: string;
  metricName: string;
  // bucketName[i] is name of bucket i
  bucketNames: string[];
  bucketMin: number;
  bucketMax: number;
  bucketStep: number;
  bucketRightBounds: number[];
  bucketIntervals: number[][];
  bucketInfo: SystemInfoFeature["bucket_info"];
  // bucket[i][j] is the jth example in the ith bucket
  bucketsOfSamples: BucketCase[][];
  values: number[];
  numbersOfSamples: number[];
  confidenceScores: [number, number][];
}

// export interface SystemAnalysisParsed {
//   resultsFineGrainedParsed: ResultFineGrainedParsed[];
//   /* key: feature key a object key of a feature
//   for retrieving the value from resultsFineGrainedParsed
//   value: description is a description/name of a feature to be displayed in the UI
//   */
//   featureNameToDescription: { [key: string]: string };
// }

// Examples to be shown in the analysis table when a bar is clicked
export interface ActiveSystemExamples {
  // invariant information across systems
  // but depends on which bar or graph is clicked.
  title: string;
  barIndex: number;

  // system-dependent information across systems
  systemIndex: number;
  bucketOfSamplesList: BucketCase[][];
}

export interface SystemInfoFeatureBucketInfo {
  method: string;
  number: number;
  setting: number | number[];
}

export interface SystemInfoFeature {
  bucket_info: SystemInfoFeatureBucketInfo | null;
  description: string | null;
  dtype?: string;
  is_bucket: boolean;
  require_training_set: boolean;
  _type: string;
}

export interface UIBucketInfo {
  min: number;
  max: number;
  // right bound of each interval, except the last one
  rightBounds: number[];
  /* tracks if a bucket info is updated by the user,
  if true, we add the bucket info in the POST request body
  */
  updated: boolean;
}
