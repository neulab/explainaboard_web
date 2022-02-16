// interface modified from https://app.quicktype.io/

import { Metric } from "../../clients/openapi";

export interface Features {
  [key: string]: FeatureVal;
}

export interface FeatureVal {
  _type: string;
  bucket_info: BucketInfo | null;
  description: string | null | undefined;
  id: null;
  is_bucket: boolean;
  is_pre_computed: boolean;
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
  overall: { [key: string]: Metric };
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
  description: string;
  metricName: string;
  bucketNames: string[];
  // TODO the latter type is for NER
  bucketsOfSamples: Array<string[]>; // | Array<{[key: string]: string}[]>;
  values: number[];
  numbersOfSamples: number[];
  confidenceScores: Array<[number, number]>;
}
