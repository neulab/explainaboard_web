import { System, SystemAnalysis } from "../clients/openapi";
import moment, { Moment } from "moment";
import { Features, Results } from "../components/AnalysisReport/types";

/** same as System, but `created_at` is replaced with Moment to make it easier to use*/
export interface SystemModel extends Omit<System, "created_at"> {
  analysis: SystemAnalysisModel;
  created_at: Moment;
  dataset_name: string;
}

/** A model that implements SystemAnalysis to provide useful methods */
export class SystemAnalysisModel implements SystemAnalysis {
  constructor(public features: Features, public results: Results) {}

  /** returns the metric given the metric name, returns undefined if not available */
  getMetirc(metricName: string) {
    return this.results.overall[metricName];
  }

  /** returns a list of metric names in results.overall */
  getMetricNames(): string[] {
    return Object.keys(this.results.overall);
  }
}

/** construct a `SystemModel` from `System` */
export const newSystemModel = (
  system: System,
  datasetName: string
): SystemModel => {
  return {
    ...system,
    dataset_name: datasetName,
    created_at: moment(system.created_at),
    analysis: new SystemAnalysisModel(
      system.analysis.features,
      system.analysis.results
    ),
  };
};
