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
  bucket_samples: string[];
  confidence_score_low: string;
  confidence_score_up: string;
  metric_name: string;
  n_samples: number;
  value: string;
}

export interface ResultFineGrainedParsed {
  title: string;
  metricName: string;
  bucketNames: string[];
  bucketsOfSamples: Array<string[]>;
  values: number[];
  numbersOfSamples: number[];
  confidenceScores: Array<[number, number]>;
}
