// interface modified from https://app.quicktype.io/

import { AnalysisCase, Performance } from "../../clients/openapi";

export interface ResultFineGrainedParsed {
  /**
   * Bucketed performance for a single metric/feature/system combination
   */
  // The name of the feature
  featureName: string;
  // The description of the feature
  featureDescription: string;
  // The name of the metric
  metricName: string;
  // bucketNames[i] is name of bucket i
  bucketNames: string[];
  // The intervals of each bucket
  bucketIntervals: BucketIntervals;
  // Information about how bucketing should be done
  bucketInfo: SystemInfoFeatureBucketInfo | null;
  // The number of samples in each bucket
  numbersOfSamples: number[];
  // performances[i]: performance (value/confidence) for bucket i
  performances: Performance[];
  // cases[i][j]: is the ith bucket's jth example
  cases: AnalysisCase[][];
}

// Examples to be shown in the analysis table when a bar is clicked
export interface ActiveSystemExamples {
  // invariant information across systems
  // but depends on which bar or graph is clicked.
  title: string;
  barIndex: number;

  // system-dependent information across systems
  systemIndex: number;
  bucketOfSamplesList: AnalysisCase[][];
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
