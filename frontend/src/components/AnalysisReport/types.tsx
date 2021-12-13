// interface modified from https://app.quicktype.io/

export interface AnalysisJson {
  analysis: Analysis;
}

export interface Analysis {
  features: Features;
  results: Results;
}

interface Features {
  label: TextClass;
  predicted_label: Label;
  sentence_length: FeaturesSentenceLength;
  text: TextClass;
  token_number: TextClass;
  true_label: Label;
}

interface TextClass {
  _type: string;
  bucket_info: LabelBucketInfo | null;
  dtype: string;
  id: null;
  is_bucket: boolean;
  is_pre_computed: boolean;
}

interface LabelBucketInfo {
  _method: string;
  _number: number;
  // _setting: any[] | number;
}

interface Label {
  _type: string;
  bucket_info: null;
  id: null;
  is_bucket: boolean;
  is_pre_computed: boolean;
  names: string[];
  names_file: null;
  num_classes: number;
}

interface FeaturesSentenceLength {
  _type: string;
  bucket_info: SentenceLengthBucketInfo;
  dtype: string;
  id: null;
  is_bucket: boolean;
  is_pre_computed: boolean;
}

interface SentenceLengthBucketInfo {
  _method: string;
  _number: number;
  // _setting: any[];
}

interface Results {
  fine_grained: FineGrained;
  is_print_case: boolean;
  is_print_confidence_interval: boolean;
  overall: Overall[];
}

interface FineGrained {
  label: Array<LabelElement[]>;
  sentence_length: Array<SentenceLengthElement[]>;
  token_number: Array<SentenceLengthElement[]>;
}

interface LabelElement {
  bucket_name: string[];
  bucket_samples: BucketSample[];
  confidence_score_low: string;
  confidence_score_up: string;
  metric_name: string;
  n_samples: number;
  value: string;
}

interface BucketSample {
  predicted_label: Array<PredictedLabelEnum[] | number>;
  text: Array<TextEnum[] | number>;
  true_label: Array<TrueLabelEnum[] | number>;
}

enum PredictedLabelEnum {
  PredictedLabel = "predicted_label",
}

enum TextEnum {
  Text = "text",
}

enum TrueLabelEnum {
  TrueLabel = "true_label",
}

interface SentenceLengthElement {
  bucket_name: number[];
  bucket_samples: BucketSample[];
  confidence_score_low: string;
  confidence_score_up: string;
  metric_name: string;
  n_samples: number;
  value: string;
}

interface Overall {
  confidence_score_low: string;
  confidence_score_up: string;
  metric_name: string;
  value: string;
}
