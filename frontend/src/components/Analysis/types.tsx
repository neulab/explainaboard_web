// interface modified from https://app.quicktype.io/

import { Performance } from "../../clients/openapi";

export interface Features {
  [key: string]: FeatureVal;
}

export interface FeatureVal {
  _type: string;
  bucket_info: BucketInfo | null;
  description: string | null | undefined;
  id: null;
  is_bucket: boolean;
  dtype?: string;
  names?: string[];
  names_file?: null;
  num_classes?: number;
}

export interface BucketInfo {
  _method: string;
  _number: number;
  _setting: number[] | number;
}

export interface Results {
  fine_grained: FineGrained;
  is_print_case?: boolean;
  is_print_confidence_interval?: boolean;
  overall: { [key: string]: Performance };
}

export interface FineGrained {
  [key: string]: Array<FineGrainedElement[]>;
}

export interface FineGrainedElement {
  bucket_name: string[] | number[];
  // TODO the latter type is for NER
  bucket_samples: string[]; // | {[key: string]: string}[];
  confidence_score_low: string;
  confidence_score_up: string;
  metric_name: string;
  n_samples: number;
  value: string;
}

export interface ResultFineGrainedParsed {
  systemID: string;
  task: string;
  featureKey: string;
  description: string;
  metricName: string;
  bucketNames: string[];
  bucketMin: number;
  bucketMax: number;
  bucketStep: number;
  bucketRightBounds: number[];
  bucketIntervals: Array<number[]>;
  bucketInfo: SystemInfoFeature["bucket_info"];
  // TODO the latter type is for NER
  bucketsOfSamples: Array<string[]>; // | Array<{[key: string]: string}[]>;
  values: number[];
  numbersOfSamples: number[];
  confidenceScores: Array<[number, number]>;
}

export interface SystemAnalysisParsed {
  resultsFineGrainedParsed: ResultFineGrainedParsed[];
  /* key: feature key a object key of a feature
  for retrieving the value from resultsFineGrainedParsed
  value: description is a description/name of a feature to be displayed in the UI
  */
  featureKeyToDescription: { [key: string]: string };
}

export interface MetricToSystemAnalysesParsed {
  [key: string]: SystemAnalysisParsed[];
}

// Examples to be shown in the analysis table when a bar is clicked
export interface ActiveSystemExamples {
  // invariant information across systems
  // but depends on which bar or graph is clicked.
  title: string;
  barIndex: number;

  // These are technically not invariant across sytems,
  // but they may be in the future, and it's easier to keep them here for now.
  featureKeyToDescription: SystemAnalysisParsed["featureKeyToDescription"];

  // system-dependent information across systems
  systemIndex: number;
  // TODO the latter type is for NER | {[key: string]: string}[]
  bucketOfSamplesList: string[][];
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

export interface FeatureKeyToUIBucketInfo {
  [featureKey: string]: UIBucketInfo;
}
