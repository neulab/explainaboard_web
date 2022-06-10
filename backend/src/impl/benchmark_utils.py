from __future__ import annotations

import json
import os
from dataclasses import dataclass

import pandas as pd
from explainaboard_web.impl.constants import POP_WEIGHT
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
    def config_dict_from_file(path_json: str) -> dict:
        with open(path_json, "r") as fin:
            benchmark_config = json.load(fin)
        # If a parent exists, then get the parent and update
        parent_id = benchmark_config.get("parent")
        if parent_id:
            parent_config = BenchmarkUtils.config_dict_from_id(parent_id)
            parent_config.update(benchmark_config)
            return parent_config
        return benchmark_config

    @staticmethod
    def config_dict_from_str(json_str: str) -> dict:
        return json.loads(json_str)

    @staticmethod
    def config_dict_from_id(benchmark_id: str) -> dict:
        # TODO(gneubig): get this from the database eventually
        scriptpath = os.path.dirname(__file__)

        # Get config
        return BenchmarkUtils.config_dict_from_file(
            os.path.join(scriptpath, "./benchmark_configs/" + benchmark_id + ".json")
        )

    @staticmethod
    def load_sys_infos(config: BenchmarkConfig) -> list[dict]:
        sys_infos: list[dict] = []
        if config.system_query is not None:
            systems_return = SystemDBUtils.query_systems(
                query=config.system_query, page=0, page_size=0
            )
        elif config.datasets is not None:
            dataset_list = []
            for record in config.datasets:
                dataset_name = record["dataset_name"]
                subdataset_name = record.get("sub_dataset", None)
                dataset_split = record.get("dataset_split", "test")
                dataset_list.append((dataset_name, subdataset_name, dataset_split))
            systems_return = SystemDBUtils.find_systems(
                ids=None, page=0, page_size=0, dataset_list=dataset_list
            )
        else:
            raise ValueError("system_query or datasets must be set by each benchmark")

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
        # --- Get df entries

        # TODO(gneubig): this function is a bit hacky/fragile, using objects and dicts
        #                interchangeably due to OpenAPI deserialization being
        #                incomplete. Should be fixed.

        # --- Collect each dataset to be included in the benchmark
        if config.datasets:
            dataset_to_id = {
                (
                    x["dataset_name"],
                    x.get("sub_dataset", None),
                    x.get("split", "test"),
                ): i
                for i, x in enumerate(config.datasets)
            }
        else:
            dataset_to_id = {}
            for sys in systems:
                data_id = (
                    sys["dataset_name"],
                    sys["sub_dataset_name"],
                    sys["dataset_split"],
                )
                dataset_to_id[data_id] = dataset_to_id.get(data_id, len(dataset_to_id))

        # --- Rearrange so we have each system's result over each dataset
        system_dataset_results: dict[str, list[dict | None]] = {}
        for sys in systems:
            sys_name = sys["system_name"]
            if sys_name not in system_dataset_results:
                system_dataset_results[sys_name] = [None for _ in config.datasets]
            dataset_id = dataset_to_id[
                (sys["dataset_name"], sys["sub_dataset_name"], sys["dataset_split"])
            ]
            system_dataset_results[sys_name][dataset_id] = sys

        # --- Set up the columns of the dataframe
        # Default dataset information columns
        df_input: dict[str, list] = {
            "system_name": [],
            "dataset_name": [],
            "sub_dataset_name": [],
            "dataset_split": [],
        }
        # Extra dataset information columns needed by datasets or operations
        exclude_keys = {"metrics"}
        if config.datasets:
            for dataset in config.datasets:
                for dataset_key in dataset.keys():
                    if not (dataset_key in df_input or dataset_key in exclude_keys):
                        df_input[dataset_key] = []
        for view in config.views:
            for operation in view.operations:
                op_key = operation.get("weight")
                if op_key and not (op_key in df_input or op_key in exclude_keys):
                    df_input[op_key] = []
        # Columns regarding metric scores
        df_input["metric"] = []
        df_input["metric_weight"] = []
        df_input["score"] = []

        # --- Create the actual data
        for sys_name, sys_infos in system_dataset_results.items():
            for dataset, sys_info in zip(config.datasets, sys_infos):
                column_dict = dict(dataset)
                column_dict["system_name"] = sys_name
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
                    column_dict["metric_weight"] = dataset_metric.get(
                        "weight", 1.0 / len(dataset_metrics)
                    )
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
                        if df_key in column_dict:
                            info = column_dict[df_key]
                        elif sys_info and df_key in sys_info:
                            info = sys_info[df_key]
                        else:
                            # TODO(gneubig): this is not ideal, we should probably not
                            #   be using information in benchmarks that we can't get
                            #   from either the dataset or system info
                            info = None
                        df_arr.append(info)

        return pd.DataFrame(df_input)

    @staticmethod
    def aggregate_view(
        input_df: pd.DataFrame, view_spec: BenchmarkViewConfig
    ) -> pd.DataFrame:
        if input_df.empty:
            return input_df
        output_df = input_df.copy()
        skip_systems = False
        print(f"input_df={input_df}")
        for operation in view_spec.operations:
            # group_by info
            group_by: str | list[str] = operation.get("group_by", [])
            if isinstance(group_by, str):
                group_by = [group_by]
            if not operation.get("skip_group_system"):
                group_by = ["system_name"] + group_by
            # weight map info, including special ones indexed by a string
            weight_map: dict[str, float] | str | None = operation.get("weight_map")
            if isinstance(weight_map, str):
                special_weights = {"pop_weight": POP_WEIGHT}
                weight_map = special_weights[weight_map]
            # Perform operations
            if operation["op"] == "mean":
                output_df = output_df.groupby(group_by).mean()
            elif operation["op"] == "multiply":
                if weight_map:
                    output_df["score"] = output_df["score"] * output_df[
                        operation["weight"]
                    ].map(weight_map)
                else:
                    output_df["score"] = (
                        output_df["score"] * output_df[operation["weight"]]
                    )
            elif operation["op"] == "sum":
                output_df = output_df.groupby(group_by).sum()
            elif operation["op"] == "weighted_sum":
                if weight_map:
                    output_df["score"] = output_df["score"] * output_df[
                        operation["weight"]
                    ].map(weight_map)
                else:
                    output_df["score"] = (
                        output_df["score"] * output_df[operation["weight"]]
                    )
                output_df = output_df.groupby(group_by).sum()
            else:
                raise ValueError(f"Unsupported operation {operation['op']} in spec.")
            if output_df.isnull().values.any():
                raise ValueError(f"op {operation} resulted in NaN:\n{output_df}")
            output_df.reset_index(inplace=True)
            print(f"--- operation={operation}")
            print(f"output_df={output_df}")
        # Remove all numerical columns other than score
        output_df = pd.concat(
            [output_df.select_dtypes(["object"]), output_df["score"]], axis=1
        )

        # When skipping systems the return df (output_df) only has one row.
        # By default, when a pandas df only has one row, it becomes a series and is
        # represented as a column so the labels are in the row indices.
        # The below code compensates for this.
        if skip_systems:
            output_df = output_df.to_frame().transpose()
            output_df["system_name"] = "Overall"
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
        system_idx = sorted(list(set(input_df["system_name"])))
        # system_map = {v: i for i, v in enumerate(set(input_df["system_name"]))}
        row_col_names = [
            BenchmarkUtils._col_name(elem_names, x) for _, x in input_df.iterrows()
        ]
        column_idx = sorted(list(set(row_col_names)))
        scores = pd.DataFrame(
            {k: [0.0 for _ in system_idx] for k in column_idx}, index=system_idx
        )
        for (_, df_data), col_id in zip(input_df.iterrows(), row_col_names):
            row_id = df_data["system_name"]
            val = df_data["score"]
            scores[col_id][row_id] = val
        scores = scores.sort_values(scores.columns[0], axis=0, ascending=False)
        return BenchmarkTableData(
            name=view_name,
            system_names=list(scores.index),
            column_names=list(scores.columns),
            scores=[[scores[j][i] for j in scores.columns] for i in scores.index],
        )
