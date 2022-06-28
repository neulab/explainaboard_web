from __future__ import annotations

import datetime
import json
import os
from dataclasses import dataclass

import pandas as pd
from explainaboard.utils.cache_api import get_cache_dir, sanitize_path
from explainaboard_web.impl.constants import LING_WEIGHT, POP_WEIGHT
from explainaboard_web.impl.db_utils.dataset_db_utils import DatasetDBUtils
from explainaboard_web.impl.db_utils.system_db_utils import SystemDBUtils
from explainaboard_web.models import (
    BenchmarkConfig,
    BenchmarkMetric,
    BenchmarkTableData,
    BenchmarkViewConfig,
    DatasetMetadata,
)
from pandas import Series


@dataclass
class BenchmarkUtils:

    _SPECIAL_WEIGHT_MAPS = {"pop_weight": POP_WEIGHT, "ling_weight": LING_WEIGHT}

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
            systems_return = SystemDBUtils.find_systems(
                dataset_name=config.system_query.get("dataset_name"),
                subdataset_name=config.system_query.get("sub_dataset"),
                task=config.system_query.get("task"),
                source_language=config.system_query.get("source_language"),
                target_language=config.system_query.get("target_language"),
                page=0,
                page_size=0,
            )
            if systems_return.total == 0:
                raise ValueError(f"no system outputs found for {config.system_query}")
        elif config.datasets is not None:
            dataset_list = []
            for record in config.datasets:
                dataset_name = record["dataset_name"]
                subdataset_name = record.get("sub_dataset", None)
                dataset_split = record.get("dataset_split", "test")
                dataset_list.append((dataset_name, subdataset_name, dataset_split))
            systems_return = SystemDBUtils.find_systems(
                page=0, page_size=0, dataset_list=dataset_list
            )
        else:
            raise ValueError("system_query or datasets must be set by each benchmark")

        systems = systems_return.systems
        for system in systems:
            temp = system.system_info.to_dict()
            temp["creator"] = system.creator.split("@")[0]
            temp["created_at"] = system.created_at
            sys_infos.append(temp)
        return sys_infos

    @staticmethod
    def generate_dataframe_from_sys_ids(config: BenchmarkConfig, system_ids: list[str]):
        return NotImplementedError

    @staticmethod
    def generate_dataframe_from_sys_infos(
        benchmark_config: BenchmarkConfig, systems: list[dict]
    ):
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
        # Get from configuration if it exists
        if benchmark_config.datasets:
            dataset_configs = [dict(x) for x in benchmark_config.datasets]
        # Collect (and deduplicate) all datasets from system infos otherwise
        else:
            dataset_tuples = list(
                set(
                    [
                        (x["dataset_name"], x["sub_dataset_name"], x["dataset_split"])
                        for x in systems
                    ]
                )
            )
            dataset_configs = [
                {"dataset_name": x, "sub_dataset": y, "dataset_split": z}
                for x, y, z in dataset_tuples
            ]
        dataset_to_id = {
            (x["dataset_name"], x.get("sub_dataset", None), x.get("split", "test")): i
            for i, x in enumerate(dataset_configs)
        }
        dataset_metadatas: list[DatasetMetadata] = []
        for x in dataset_configs:
            dataset_return = DatasetDBUtils.find_datasets(
                dataset_name=x["dataset_name"], sub_dataset=x["sub_dataset"]
            )
            if dataset_return.total != 1:
                raise ValueError(
                    f'Could not find dataset {x["dataset_name"]}, {x["sub_dataset"]}'
                )
            dataset_metadatas.append(dataset_return.datasets[0])

        # --- Rearrange so we have each system's result over each dataset
        system_dataset_results: dict[str, list[dict | None]] = {}
        for sys in systems:
            sys_name = sys["system_name"]
            if sys_name not in system_dataset_results:
                system_dataset_results[sys_name] = [
                    {"creator": sys["creator"]} for _ in dataset_configs
                ]
            dataset_id = dataset_to_id[
                (sys["dataset_name"], sys["sub_dataset_name"], sys["dataset_split"])
            ]
            system_dataset_results[sys_name][dataset_id] = sys
        # --- Set up the columns of the dataframe
        # Default dataset information columns
        df_input: dict[str, list] = {
            "system_name": [],
            "dataset_name": [],
            "sub_dataset": [],
            "dataset_split": [],
            "creator": [],
        }
        # Extra dataset information columns needed by datasets or operations
        exclude_keys = ["metrics"] + list(BenchmarkUtils._SPECIAL_WEIGHT_MAPS.keys())
        for dataset_config in dataset_configs:
            for dataset_key in dataset_config.keys():
                if not (dataset_key in df_input or dataset_key in exclude_keys):
                    df_input[dataset_key] = []
        for view in benchmark_config.views:
            for operation in view.operations:
                op_keys = [operation.get("weight")] + operation.get("group_by", [])
                for op_key in op_keys:
                    if op_key and not (op_key in df_input or op_key in exclude_keys):
                        df_input[op_key] = []

        # Columns regarding metric scores
        df_input["metric"] = []
        df_input["metric_weight"] = []
        df_input["score"] = []

        # --- Create the actual data
        for sys_name, sys_infos in system_dataset_results.items():
            for dataset_config, dataset_metadata, sys_info in zip(
                dataset_configs, dataset_metadatas, sys_infos
            ):
                column_dict = dict(dataset_config)
                column_dict["system_name"] = sys_name
                dataset_metrics: list[BenchmarkMetric] = dataset_config.get(
                    "metrics", benchmark_config.metrics
                )
                if dataset_metrics is None:
                    raise ValueError(
                        f"metrics must be specified either on a global or "
                        f'local level, but {dataset_config["dataset_name"]} -- '
                        f'{dataset_config["sub_dataset"]} -- '
                        f'{dataset_config["dataset_split"]} specified neither'
                    )
                for dataset_metric in dataset_metrics:
                    if type(dataset_metric) != dict:
                        dataset_metric = dataset_metric.to_dict()
                    column_dict["metric"] = dataset_metric["name"]
                    column_dict["metric_weight"] = dataset_metric.get(
                        "weight", 1.0 / len(dataset_metrics)
                    )
                    if len(sys_info) != 1:

                        column_dict["creator"] = sys_info["creator"]
                        performance = sys_info["results"]["overall"].get(
                            dataset_metric["name"]
                        )
                        column_dict["score"] = (
                            performance["value"]
                            if performance
                            else (dataset_metric.get("default") or 0.0)
                        )
                    else:
                        column_dict["creator"] = sys_info["creator"]
                        column_dict["score"] = dataset_metric.get("default") or 0.0
                    for df_key, df_arr in df_input.items():
                        if df_key in column_dict:
                            info = column_dict[df_key]
                        elif df_key == "dataset_split":
                            info = "test"
                        elif df_key == "source_language":
                            if len(dataset_metadata.languages) == 0:
                                raise ValueError(f"no {df_key} in {dataset_metadata}")
                            info = dataset_metadata.languages[0]
                        elif df_key == "target_language":
                            if len(dataset_metadata.languages) == 0:
                                raise ValueError(f"no {df_key} in {dataset_metadata}")
                            info = dataset_metadata.languages[-1]
                        else:
                            raise ValueError(f"could not find information for {df_key}")
                        df_arr.append(info)
        return pd.DataFrame(df_input)

    @staticmethod
    def aggregate_view(
        input_df: pd.DataFrame, view_spec: BenchmarkViewConfig, by_creator: bool
    ) -> pd.DataFrame:
        if input_df.empty:
            return input_df
        output_df = input_df.copy()
        for operation in view_spec.operations:
            # group_by info
            group_by: str | list[str] = operation.get("group_by", [])
            if isinstance(group_by, str):
                group_by = [group_by]
            if not operation.get("skip_group_system") and not by_creator:
                group_by = ["system_name"] + group_by
            if not operation.get("skip_group_system") and by_creator:
                group_by = ["creator"] + group_by
            # weight map info, including special ones indexed by a string
            weight_map: dict[str, float] | str | None = operation.get("weight_map")
            if isinstance(weight_map, str):
                weight_map = BenchmarkUtils._SPECIAL_WEIGHT_MAPS[weight_map]
            # Perform operations
            op = operation["op"]
            if op in {"mean", "sum", "max", "min"}:
                if len(group_by) > 0:
                    output_df = output_df.groupby(group_by)
                if op == "mean":
                    output_df = output_df.mean(numeric_only=True)
                elif op == "sum":
                    output_df = output_df.sum(numeric_only=True)
                elif op == "max":
                    output_df = output_df.max(numeric_only=True)
                elif op == "min":
                    output_df = output_df.max(numeric_only=True)
            elif op in {"multiply", "weighted_sum"}:
                weight = output_df[operation["weight"]]
                if weight_map:
                    weight = weight.map(weight_map)
                output_df["score"] = output_df["score"] * weight
                if op == "weighted_sum":
                    if len(group_by):
                        output_df = output_df.groupby(group_by).sum(numeric_only=True)
                    else:
                        output_df = output_df.sum(numeric_only=True)
            else:
                raise ValueError(f"Unsupported operation {operation['op']} in spec.")
            if output_df.isnull().values.any():
                raise ValueError(f"op {operation} resulted in NaN:\n{output_df}")
            # By default, when a pandas df is aggregated without groupby it becomes a
            # series and is represented as a column so the labels are in the row
            # indices. The below code compensates for this.
            if isinstance(output_df, Series):
                output_df = output_df.to_frame().transpose()
                if by_creator:
                    output_df["creator"] = "Overall"
                else:
                    output_df["system_name"] = "Overall"
            else:
                output_df.reset_index(inplace=True)

        # Remove all numerical columns other than score
        output_df = pd.concat(
            [output_df.select_dtypes(["object"]), output_df["score"]], axis=1
        )
        return output_df

    @staticmethod
    def generate_view_dataframes(
        config: BenchmarkConfig, orig_df: pd.DataFrame, by_creator
    ) -> list[tuple[str, pd.DataFrame]]:

        view_dfs = []
        for view_spec in config.views:
            view_dfs.append(
                (
                    view_spec.name,
                    BenchmarkUtils.aggregate_view(orig_df, view_spec, by_creator),
                )
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
        view_name: str, input_df: pd.DataFrame, by_creator: bool, plot_dict: dict
    ) -> BenchmarkTableData:
        if by_creator:
            col_name = "creator"
        else:
            col_name = "system_name"
        elem_names = [x for x in input_df.columns if x not in {"score", col_name}]
        system_idx = sorted(list(set(input_df[col_name])))
        # system_map = {v: i for i, v in enumerate(set(input_df[col_name]))}
        row_col_names = [
            BenchmarkUtils._col_name(elem_names, x) for _, x in input_df.iterrows()
        ]
        column_idx = sorted(list(set(row_col_names)))
        scores = pd.DataFrame(
            {k: [0.0 for _ in system_idx] for k in column_idx}, index=system_idx
        )
        for (_, df_data), col_id in zip(input_df.iterrows(), row_col_names):
            row_id = df_data[col_name]
            val = df_data["score"]
            scores[col_id][row_id] = val
        scores = scores.sort_values(scores.columns[0], axis=0, ascending=False)
        return BenchmarkTableData(
            name=view_name,
            system_names=list(scores.index),
            column_names=list(scores.columns),
            scores=[[scores[j][i] for j in scores.columns] for i in scores.index],
            plot_y_values=plot_dict[view_name],
            plot_x_values=plot_dict["times"],
        )

    @staticmethod
    def open_cached_file(relative_path, lifetime):
        sanitized_path = sanitize_path(relative_path)
        file_path = os.path.join(get_cache_dir(), sanitized_path)
        if os.path.exists(file_path):
            mod_time = datetime.datetime.fromtimestamp(os.path.getmtime(file_path))
            age = datetime.datetime.now() - mod_time
            if lifetime is None or age < lifetime:
                return file_path
        return None

    @staticmethod
    def generate_plots(benchmark_id):
        config = BenchmarkConfig.from_dict(
            BenchmarkUtils.config_dict_from_id(benchmark_id)
        )
        if config.type == "abstract":
            return {}
        plot_path = os.path.join(get_cache_dir(), benchmark_id + "_plot.json")
        plot_file = BenchmarkUtils.open_cached_file(
            benchmark_id + "_plot.json", datetime.timedelta(days=1)
        )
        if not plot_file:
            sys_infos = BenchmarkUtils.load_sys_infos(config)
            sorted_sys_infos = sorted(
                sys_infos, key=lambda sys: sys["created_at"].date()
            )
            time = sorted_sys_infos[0]["created_at"]
            current_time = datetime.datetime.now().date()
            json_dict = {k.name: [] for k in config.views}
            json_dict["Original"] = []
            json_dict["times"] = []
            while time.date() <= current_time:
                systems = [
                    sys for sys in sys_infos if sys["created_at"].date() <= time.date()
                ]
                orig_df = BenchmarkUtils.generate_dataframe_from_sys_infos(
                    config, systems
                )

                system_dfs = BenchmarkUtils.generate_view_dataframes(
                    config, orig_df, by_creator=False
                )
                system_dict = {k: v for k, v in system_dfs}
                for k, v in system_dfs:
                    if set(system_dict[k].columns) == set(["score", "system_name"]):
                        json_dict[k].append(system_dict[k].max()["score"])
                json_dict["times"].append(str(time))
                time += datetime.timedelta(days=1)
            with open(plot_path, "w") as outfile:
                json.dump(json_dict, outfile)

        with open(plot_path) as f:
            plot_data = json.load(f)
        return plot_data
