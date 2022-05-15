// interface modified from https://app.quicktype.io/

import { BucketCase } from "../../clients/openapi";

export interface ResultFineGrainedParsed {
  systemID: string;
  task: string;
  featureName: string;
  description: string;
  metricName: string;
  // bucketNames[i] is name of bucket i
  bucketNames: string[];
  bucketIntervals: BucketIntervals;
  bucketInfo: SystemInfoFeatureBucketInfo | null;
  // bucket[i][j] is the jth example in the ith bucket
  bucketCases: BucketCase[][];
  // Values of the evaluation score and confidence metrics
  values: number[];
  confidenceScores: [number, number][];
  numbersOfSamples: number[];
}

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
  /**
   * A single feature in the system info class.
   */
  bucket_info: SystemInfoFeatureBucketInfo | null;
  description: string | null;
  dtype?: string;
  is_bucket: boolean;
  require_training_set: boolean;
  _type: string;
}

export interface BucketIntervals {
  /**
   * Intervals over which to perform bucketing
   */
  // Minimum value overall
  min: number;
  // Maximum value overall
  max: number;
  // Bounds of each interval, such that the intervals are
  // (min, bounds[0]), (bounds[0], bounds[1]), ..., (bounds[i-1], max)
  bounds: number[];
  // Used when bucket intervals are updated in the UI
  updated: boolean;
}
