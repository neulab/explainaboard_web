import json
import os
from dataclasses import dataclass
from typing import cast

import numpy as np
import pandas as pd
from explainaboard_web.impl.db_utils.system_db_utils import SystemDBUtils
from explainaboard_web.models import (
    BenchmarkConfig,
    BenchmarkMetric,
    BenchmarkTableData,
    BenchmarkViewConfig,
)


@dataclass
class BenchmarkUtils:
    @staticmethod
    def config_from_json_file(path_json: str) -> BenchmarkConfig:
        with open(path_json, "r") as fin:
            benchmark_config = json.load(fin)
        return BenchmarkConfig.from_dict(benchmark_config)

    @staticmethod
    def config_from_json_str(json_str: str) -> BenchmarkConfig:
        benchmark_config = json.loads(json_str)
        return BenchmarkConfig.from_dict(benchmark_config)

    @staticmethod
    def config_from_benchmark_id(benchmark_id: str):
        # TODO(gneubig): get this from the database eventually
        scriptpath = os.path.dirname(__file__)

        # Get config
        return BenchmarkUtils.config_from_json_file(
            os.path.join(
                scriptpath, "./benchmark_configs/config_" + benchmark_id + ".json"
            )
        )

    @staticmethod
    def load_sys_infos(config: BenchmarkConfig, task: str) -> list[dict]:
        sys_infos: list[dict] = []
        if config.name == "Global":
            # hard-coded this task for now, will change later
            systems_return = SystemDBUtils.find_systems(
                ids=None, page=0, page_size=0, task=task
            )

        else:
            dataset_list = []
            for record in config.datasets:
                dataset_name = record["dataset_name"]
                subdataset_name = record.get("sub_dataset", None)
                dataset_split = record.get("dataset_split", "test")
                dataset_list.append((dataset_name, subdataset_name, dataset_split))
            systems_return = SystemDBUtils.find_systems(
                ids=None, page=0, page_size=0, dataset_list=dataset_list
            )

        systems = systems_return.systems
        for system in systems:
            sys_infos.append(system.system_info.to_dict())
        return sys_infos

    @staticmethod
    def generate_dataframe_from_sys_ids(config: BenchmarkConfig, system_ids: list[str]):
        return NotImplementedError

    @staticmethod
    def generate_dataframe_from_sys_infos(config: BenchmarkConfig, systems: list[dict]):
        """
        Generate a leaderboard from a list of system_output_info:SysOutputInfo
        :param config: A benchmark config
        :param systems: A list of system info dictionaries
        :return: leaderboard:Leaderboard
        """

        # TODO(gneubig): this function is a bit hacky/fragile, using objects and dicts
        #                interchangeably due to OpenAPI deserialization being
        #                incomplete. Should be fixed.

        # --- Rearrange so we have each system's result over each dataset
        dataset_to_id = {
            (x["dataset_name"], x.get("sub_dataset", None), x.get("split", "test")): i
            for i, x in enumerate(config.datasets)
        }
        system_dataset_results: dict[str, list[dict | None]] = {}
        for sys in systems:
            sys_name = sys["system_name"]
            if sys_name not in system_dataset_results:
                system_dataset_results[sys_name] = [None for _ in config.datasets]
            dataset_id = dataset_to_id[
                (sys["dataset_name"], sys["sub_dataset_name"], sys["dataset_split"])
            ]
            system_dataset_results[sys_name][dataset_id] = sys

        # --- Get df entries
        df_input: dict[str, list] = {
            "system_name": [],
            "dataset_name": [],
            "sub_dataset_name": [],
            "dataset_split": [],
        }
        exclude_keys = {"metrics"}
        for dataset in config.datasets:
            for dataset_key in dataset.keys():
                if not (dataset_key in df_input or dataset_key in exclude_keys):
                    df_input[dataset_key] = []
        df_input["metric"] = []
        df_input["metric_weight"] = []
        df_input["score"] = []

        # Create the actual data
        for sys_name, sys_infos in system_dataset_results.items():
            for dataset, sys_info in zip(config.datasets, sys_infos):
                column_dict = dict(dataset)
                column_dict["system_name"] = sys_name
                if "languages" in column_dict.keys() and column_dict["languages"]:
                    column_dict["languages"] = column_dict["languages"][0]
                else:
                    column_dict["languages"] = None
                dataset_metrics: list[BenchmarkMetric] = dataset.get(
                    "metrics", config.metrics
                )
                if dataset_metrics is None:
                    raise ValueError(
                        f"metrics must be specified either on a global or "
                        f'local level, but {dataset["dataset_name"]} -- '
                        f'{dataset["sub_dataset_name"]} -- '
                        f'{dataset["dataset_split"]} specified neither'
                    )
                for dataset_metric in dataset_metrics:
                    if type(dataset_metric) != dict:
                        dataset_metric = dataset_metric.to_dict()
                    column_dict["metric"] = dataset_metric["name"]
                    # column_dict["metric_weight"] = dataset_metric.get(
                    # "weight", 1.0 / len(dataset_metrics)
                    # )
                    if sys_info is not None:
                        performance = sys_info["results"]["overall"].get(
                            dataset_metric["name"]
                        )
                        column_dict["score"] = (
                            performance["value"]
                            if performance
                            else (dataset_metric.get("default") or 0.0)
                        )
                    else:
                        column_dict["score"] = dataset_metric.get("default") or 0.0
                    for df_key, df_arr in df_input.items():
                        df_arr.append(column_dict.get(df_key))

        return pd.DataFrame(df_input)

    @staticmethod
    def aggregate_view(
        input_df: pd.DataFrame, view_spec: BenchmarkViewConfig
    ) -> pd.DataFrame:
        output_df = input_df.copy()
        skip_systems = False
        for operation in view_spec.operations:
            skip_systems = operation["skip_groupby_system"]
            group_by = ([] if skip_systems else ["system_name"]) + operation.get(
                "group_by", []
            )
            if operation["op"] == "max" and operation["group_by"] == ["languages"]:
                output_df = output_df.groupby(group_by).max(numeric_only=True)
            elif operation["op"] == "mean":
                if operation["skip_groupby_system"]:
                    output_df = output_df.mean(numeric_only=True)
                else:
                    output_df = (
                        output_df.groupby("system_name")
                        .mean(numeric_only=True)
                        .reset_index()
                    )
            elif operation["op"] == "weighted_sum":
                output_df["score"] = output_df["score"] * operation["weight"]
                if operation["skip_groupby_system"]:
                    output_df = output_df.sum(numeric_only=True)
                else:
                    output_df = (
                        output_df.groupby("system_name")
                        .sum(numeric_only=True)
                        .reset_index()
                    )
            else:
                raise ValueError(f"Unsupported operation {operation['op']} in spec.")
            if output_df.isnull().values.any():
                raise ValueError(f"op {operation} resulted in NaN:\n{output_df}")
        # output_df.reset_index(inplace=True)

        """ The global benchmark takes the max of everything,
        which means the return df (output_df) only has one row.
        By default, when a pandas df only has one row,
        it becomes a series and is represented as a column
        so the labels are in the row indices.
        To be compatible with later code,
        we force it to be a dataframe with one row and labels in the columns.
        When taking max or mean over all systems,
        the value is no longer associated to one particular system,
        so we just associate it to "global" """

        if skip_systems:
            output_df = output_df.to_frame().transpose()
            output_df["system_name"] = "Global"
        return output_df

    @staticmethod
    def generate_view_dataframes(
        config: BenchmarkConfig, orig_df: pd.DataFrame
    ) -> list[tuple[str, pd.DataFrame]]:

        view_dfs = []
        for view_spec in config.views:
            view_dfs.append(
                (view_spec.name, BenchmarkUtils.aggregate_view(orig_df, view_spec))
            )
        view_dfs.append(("Original", orig_df))
        return view_dfs

    @staticmethod
    def _col_name(elem_names: list[str], df_entry):
        # TODO(gneubig): This string-based representation may not be ideal
        return "\n".join(
            ["score"]
            + [
                f"{elem}={df_entry[elem]}"
                for elem in elem_names
                if df_entry[elem] and type(df_entry[elem]) == str
            ]
        )

    @staticmethod
    def dataframe_to_table(
        view_name: str, input_df: pd.DataFrame
    ) -> BenchmarkTableData:
        elem_names = [x for x in input_df.columns if x not in {"score", "system_name"}]
        system_map = {v: i for i, v in enumerate(set(input_df["system_name"]))}
        row_col_names = [
            BenchmarkUtils._col_name(elem_names, x) for _, x in input_df.iterrows()
        ]
        column_map = {v: i for i, v in enumerate(set(row_col_names))}
        scores = np.zeros((len(system_map), len(column_map)))
        for (_, df_data), df_col_name in zip(input_df.iterrows(), row_col_names):
            row_id = system_map[df_data["system_name"]]
            col_id = column_map[df_col_name]
            val = df_data["score"]
            scores[row_id][col_id] = val
        score_lists = cast(list[list[float]], scores.tolist())
        return BenchmarkTableData(
            name=view_name,
            system_names=list(system_map.keys()),
            column_names=list(column_map.keys()),
            scores=score_lists,
        )
