// interface modified from https://app.quicktype.io/

import { AnalysisCase, Performance, ComboCount } from "../../clients/openapi";

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
  // The type of the bucket
  bucketType: string;
  // bucketNames[i] is name of bucket i
  bucketNames: string[];
  // The intervals of each bucket
  bucketIntervals: BucketIntervals;
  // The number of samples in each bucket
  numbersOfSamples: number[];
  // performances[i]: performance (value/confidence) for bucket i
  performances: Performance[];
  // Used by combo count analyses
  comboCounts: ComboCount[];
  // levelName: is the level that this result belongs to
  levelName: string;
  // cases[i][j]: is the index of the ith bucket's jth example
  cases: number[][];
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
