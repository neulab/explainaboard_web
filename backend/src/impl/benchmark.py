from __future__ import annotations

import dataclasses
import json
from dataclasses import asdict, dataclass, field
from typing import Optional

import numpy as np
import pandas as pd


@dataclass
class LeaderboardRecord:
    system_name: Optional[str] = None
    task_name: Optional[str] = None  # list or str?
    dataset_name: Optional[str] = None
    sub_dataset_name: Optional[str] = None
    dataset_split: Optional[str] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    # Note that metrics is a dict, e.g., {"F1":0.95, "Accuracy":0.5}
    metrics: Optional[dict] = None
    op_metric: Optional[str] = None
    # weight
    metric_weights: Optional[dict] = None
    dataset_weight: Optional[float] = None
    task_weight: Optional[float] = None
    target_language_weight: Optional[float] = None
    source_language_weight: Optional[float] = None
    # user info
    creator: Optional[str] = None
    created_time: Optional[str] = None

    @classmethod
    def from_dict(cls, data_dict: dict) -> LeaderboardRecord:
        field_names = set(f.name for f in dataclasses.fields(cls))
        return cls(**{k: v for k, v in data_dict.items() if k in field_names})

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Leaderboard:
    data: list[LeaderboardRecord] = field(default_factory=list)

    @classmethod
    def from_list(cls, data: list[dict]) -> Leaderboard:
        return cls(data=[LeaderboardRecord.from_dict(v1) for v1 in data])

    @classmethod
    def from_json(cls, json_str: str) -> Leaderboard:
        leaderboard_records = json.loads(json_str)
        return cls.from_list(leaderboard_records)

    def to_dict(self) -> dict:
        return asdict(self)


# Note: this is not dataclass
class Benchmark:
    def __init__(self, dictionary):
        for k, v in dictionary.items():
            setattr(self, k, v)

    def to_dict(self):
        return self.__dict__


@dataclass
class BenchmarkRecordConfig:
    dataset_name: Optional[str] = None
    sub_dataset_name: Optional[str] = None
    dataset_split: Optional[str] = None
    metrics: list[str] = field(default_factory=list)
    # metric_weights should be defined in BenchmarkRecord
    metric_weights: Optional[dict] = None
    op_metric: Optional[str] = None

    @classmethod
    def from_dict(cls, data_dict: dict) -> BenchmarkRecordConfig:
        field_names = set(f.name for f in dataclasses.fields(cls))
        return cls(**{k: v for k, v in data_dict.items() if k in field_names})

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class BenchmarkConfig:
    name: Optional[str] = None
    description: Optional[str] = None
    logo: Optional[str] = None
    record_configs: list[BenchmarkRecordConfig] = field(default_factory=list)
    aggregation_configs: Optional[dict] = None
    views: Optional[dict] = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def dict_conv(cls, k: str, v: dict):
        if k == "record_configs":
            return (
                None if v is None else [BenchmarkRecordConfig.from_dict(v1) for v1 in v]
            )
        else:
            return v

    @classmethod
    def from_dict(cls, data_dict: dict) -> BenchmarkConfig:
        field_names = set(f.name for f in dataclasses.fields(cls))
        return cls(
            **{k: cls.dict_conv(k, v) for k, v in data_dict.items() if k in field_names}
        )

    @classmethod
    def from_json_file(cls, path_json: str) -> BenchmarkConfig:
        with open(path_json, "r") as fin:
            benchmark_config = json.load(fin)
        return BenchmarkConfig.from_dict(benchmark_config)

    @classmethod
    def from_json_str(cls, json_str: str) -> BenchmarkConfig:
        benchmark_config = json.loads(json_str)
        return BenchmarkConfig.from_dict(benchmark_config)

    def generate_leaderboard_from_sys_ids(self, system_ids: list[str]):
        return NotImplementedError

    def generate_leaderboard_from_sys_infos(self, systems: list[dict]):
        """
        Generate a leaderboard from a list of system_output_info:SysOutputInfo
        :param systems:
        :return: leaderboard:Leaderboard
        """

        leaderboard = []

        for record in self.record_configs:
            for sys_info in systems:
                # get matched system outputs
                if (
                    sys_info["dataset_name"] == record.dataset_name
                    and sys_info["sub_dataset_name"] == record.sub_dataset_name
                    and sys_info["dataset_split"] == record.dataset_split
                ):
                    # get metadata from system output info
                    sys_metrics = [
                        metric_config["name"]
                        for metric_config in sys_info["metric_configs"]
                    ]
                    dataset_name = sys_info["dataset_name"]
                    task_name = sys_info["task_name"]
                    target_language = sys_info["target_language"]
                    source_language = sys_info["source_language"]

                    if len(list(set(sys_metrics) & set(record.metrics))) == 0:
                        continue
                    else:
                        leaderboard_metrics = {
                            metric: sys_info["results"]["overall"][metric]["value"]
                            for metric in record.metrics
                        }

                        # Populate information of leaderboard_record based on:
                        # (1) sys_info and (2) benchmark config: self.record_configs
                        leaderboard_record = LeaderboardRecord.from_dict(sys_info)
                        leaderboard_record.metrics = leaderboard_metrics

                        leaderboard_record.metric_weights = record.metric_weights
                        leaderboard_record.op_metric = record.op_metric
                        # Populate information based on benchmark config:
                        # self.aggregation_configs
                        if self.aggregation_configs is not None:
                            leaderboard_record.dataset_weight = (
                                self.aggregation_configs["dataset"]["weights"][  # noqa
                                    dataset_name
                                ]
                            )
                            leaderboard_record.task_weight = self.aggregation_configs[
                                "task"  # noqa
                            ]["weights"][task_name]
                            leaderboard_record.target_language_weight = (
                                self.aggregation_configs["target_language"]["weights"][
                                    target_language
                                ]
                            )
                            leaderboard_record.source_language_weight = (
                                self.aggregation_configs["source_language"]["weights"][
                                    source_language
                                ]  # noqa
                            )

                        leaderboard.append(leaderboard_record)
        return Leaderboard(leaderboard)

    def compose(self, leaderboard: Leaderboard) -> Benchmark:
        """
        Compose a benchmark:Benchmark based on (1) leaderboard and (2) self.config
        :param leaderboard: Leaderboard
        :return: benchmark:Benchmark
        """

        json_dict = leaderboard.to_dict()["data"]
        df = pd.json_normalize(json_dict)

        def aggregation_over_metrics(df: pd.DataFrame, op: str = "weighted_average"):

            metrics = []
            df = df.fillna(0)
            for col_name in df.columns.tolist():
                if col_name.split(".")[0] == "metrics":
                    metrics.append(col_name.split(".")[1])
            metrics = set(metrics)  # type:ignore
            v_list = ["metrics." + metric for metric in metrics]  # metric values
            w_list = ["metric_weights." + metric for metric in metrics]  # weights

            def f(x):
                if x["op_metric"] == "weighted_average":
                    return (
                        0
                        if np.count_nonzero([x[w] for w in w_list]) == 0
                        else np.sum([x[v] * x[w] for v, w in zip(v_list, w_list)])
                        / np.count_nonzero([x[w] for w in w_list])
                    )
                elif x["op_metric"] == "mean":
                    # print("----------------")
                    # print([x[v] for v in v_list])
                    # print(np.count_nonzero([x[v] for v in v_list]))
                    return (
                        0
                        if np.count_nonzero([x[v] for v in v_list]) == 0
                        else np.sum([x[v] for v in v_list])
                        / np.count_nonzero([x[v] for v in v_list])
                    )
                elif x["op_metric"] == "sum":
                    return np.sum([x[v] for v in v_list])
                else:
                    raise NotImplementedError

            # aggregate over metrics
            df["overall_result"] = df.apply(f, axis=1)

            return df

        def aggregate_over_attributes(
            df: pd.DataFrame,
            grouped_attributes: list,
            weight_name: str,
            op: str = "mean",
        ):

            if "overall_result" not in df.columns.tolist():
                df = aggregation_over_metrics(df)

            wm = None
            if op == "weighted_average":
                wm = lambda x: np.average(  # noqa: E731
                    x, weights=df.loc[x.index, weight_name]
                )
            else:
                wm = op  # type:ignore

            df_new = (
                df.groupby(grouped_attributes)
                .agg(overall_result=("overall_result", wm))
                .reset_index()
            )

            return df_new

        benchmark = {}
        if self.views is None:
            raise ValueError("views shouldn't be none")
        for view, setting in self.views.items():  # noqa
            df_view = aggregate_over_attributes(
                df,
                grouped_attributes=setting["grouped_attributes"],
                weight_name=setting["weight_name"],
                op=setting["op"],
            )
            benchmark[view] = df_view.to_dict(orient="records")

        return Benchmark(benchmark)

    def generate_benchmarks(self, systems: list[dict]) -> Benchmark:

        leaderboard = self.generate_leaderboard_from_sys_infos(systems)
        benchmark = self.compose(leaderboard)
        return benchmark
