import json
import os
from dataclasses import dataclass

import pandas as pd
from explainaboard_web.impl.constants import POP_WEIGHT
from explainaboard_web.impl.db_utils.system_db_utils import SystemDBUtils
from explainaboard_web.models import (
    BenchmarkConfig,
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
        # --- Get df entries
        df_input: dict[str, list] = {
            "system_name": [],
            "dataset_name": [],
            "sub_dataset_name": [],
            "dataset_split": [],
            "source_language": [],
            "metric": [],
            "metric_weight": [],
            "score": [],
        }

        for sys in systems:
            column_dict = {}
            column_dict["system_name"] = sys["system_name"]
            column_dict["dataset_name"] = sys["dataset_name"]
            column_dict["sub_dataset_name"] = sys["sub_dataset_name"]
            column_dict["dataset_split"] = sys["dataset_split"]
            column_dict["source_language"] = sys["source_language"]

            for metric in sys["metric_configs"]:
                if type(metric) != dict:
                    metric = metric.to_dict()
                column_dict["metric"] = metric["name"]
                column_dict["metric_weight"] = metric.get(
                    "weight", 1.0 / len(sys["metric_configs"])
                )
                column_dict["score"] = sys["results"]["overall"][column_dict["metric"]][
                    "value"
                ]
                for k, v in df_input.items():
                    v.append(column_dict[k])

        return pd.DataFrame(df_input)

    @staticmethod
    def aggregate_view(
        input_df: pd.DataFrame, view_spec: BenchmarkViewConfig
    ) -> pd.DataFrame:
        if input_df.empty:
            return input_df
        output_df = input_df.copy()
        skip_systems = False
        for operation in view_spec.operations:
            skip_systems = operation["skip_groupby_system"]
            group_by = ([] if skip_systems else ["system_name"]) + operation.get(
                "group_by", []
            )
            if operation["op"] == "max" and operation["group_by"] == [
                "source_language"
            ]:
                output_df = (
                    output_df.groupby(group_by).max(numeric_only=True).reset_index()
                )
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
                if operation["weight"] == "pop_weight":
                    weights = [
                        POP_WEIGHT[lang] for lang in output_df["source_language"]
                    ]
                    output_df["score"] = output_df["score"] * weights
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
