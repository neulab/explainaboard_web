import os
import pathlib
from unittest import TestCase

import numpy as np
import pandas as pd
from explainaboard_web.impl.benchmark_utils import BenchmarkUtils
from explainaboard_web.impl.constants import POP_WEIGHT


class TestBenchmark(TestCase):
    @staticmethod
    def _config_path():
        return os.path.join(
            os.path.dirname(pathlib.Path(__file__)),
            os.path.pardir,
            "impl",
            "benchmark_configs",
        )

    def assertDeepAlmostEqual(self, expected, actual, *args, **kwargs):
        """
        Assert that two complex structures have almost equal contents.

        Compares lists, dicts and tuples recursively. Checks numeric values
        using test_case's :py:meth:`unittest.TestCase.assertAlmostEqual` and
        checks all other values with :py:meth:`unittest.TestCase.assertEqual`.
        Accepts additional positional and keyword arguments and pass those
        intact to assertAlmostEqual() (that's how you specify comparison
        precision).

        :param test_case: TestCase object on which we can call all of the basic
        'assert' methods.
        """
        is_root = "__trace" not in kwargs
        trace = kwargs.pop("__trace", "ROOT")
        try:
            if isinstance(expected, (int, float, complex)):
                self.assertAlmostEqual(expected, actual, *args, **kwargs)
            elif isinstance(expected, (list, tuple, np.ndarray)):
                self.assertEqual(len(expected), len(actual))
                for index in range(len(expected)):
                    v1, v2 = expected[index], actual[index]
                    self.assertDeepAlmostEqual(
                        v1, v2, __trace=repr(index), *args, **kwargs
                    )
            elif isinstance(expected, dict):
                self.assertEqual(set(expected), set(actual))
                for key in expected:
                    self.assertDeepAlmostEqual(
                        expected[key], actual[key], __trace=repr(key), *args, **kwargs
                    )
            else:
                self.assertEqual(expected, actual)
        except AssertionError as exc:
            exc.__dict__.setdefault("traces", []).append(trace)
            if is_root:
                trace = " -> ".join(reversed(exc.traces))
                exc = AssertionError("%s\nTRACE: %s" % (exc.message, trace))
            raise exc

    def test_masakhaner_aggregate(self):

        json_file = os.path.join(TestBenchmark._config_path(), "config_masakhaner.json")
        config = BenchmarkUtils.config_from_json_file(json_file)

        languages = [
            "bam",
            "bbj",
            "ewe",
            "fon",
            "hau",
            "ibo",
            "kin",
            "lug",
            "mos",
            "nya",
            "pcm",
            "sna",
            "swa",
            "tsn",
            "twi",
            "wol",
            "xho",
            "yor",
            "zul",
        ]
        sub_datasets = [f"masakhaner-{x}" for x in languages]
        pop_weights = [POP_WEIGHT[x] for x in languages]
        np_pop_weight = np.array(pop_weights)
        all_systems = ["sys1" for _ in sub_datasets] + ["sys2" for _ in sub_datasets]
        all_metrics = ["F1" for _ in sub_datasets] + ["F1" for _ in sub_datasets]
        all_dataset_names = ["masakhaner" for _ in sub_datasets] + [
            "masakhaner" for _ in sub_datasets
        ]
        all_sub_datasets = sub_datasets + sub_datasets
        all_languages = languages + languages
        np_sys1_f1s = np.random.rand(len(sub_datasets))
        np_sys2_f1s = np.random.rand(len(sub_datasets))
        all_f1s = list(np_sys1_f1s) + list(np_sys2_f1s)

        orig_df = pd.DataFrame(
            {
                "dataset_name": all_dataset_names,
                "sub_dataset": all_sub_datasets,
                "system_name": all_systems,
                "source_language": all_languages,
                "metric": all_metrics,
                "score": all_f1s,
            }
        )
        view_dfs = BenchmarkUtils.generate_view_dataframes(config, orig_df)
        mean_df = pd.DataFrame(
            {
                "system_name": ["sys1", "sys2"],
                "score": [np_sys1_f1s.mean(), np_sys2_f1s.mean()],
            }
        )
        pop_df = pd.DataFrame(
            {
                "system_name": ["sys1", "sys2"],
                "score": [
                    np_pop_weight.dot(np_sys1_f1s),
                    np_pop_weight.dot(np_sys2_f1s),
                ],
            }
        )

        self.assertDeepAlmostEqual(mean_df.to_dict(), view_dfs[0][1].to_dict())
        self.assertDeepAlmostEqual(pop_df.to_dict(), view_dfs[1][1].to_dict())
        self.assertDeepAlmostEqual(orig_df.to_dict(), view_dfs[2][1].to_dict())

    def test_dataframe_to_table(self):
        orig_df = pd.DataFrame(
            {
                "system_name": ["sys1", "sys2", "sys3", "sys1", "sys2", "sys3"],
                "dataset_name": ["data1", "data1", "data1", "data2", "data2", "data2"],
                "score": [0.6, 0.7, 0.5, 0.9, 0.8, 0.0],
            }
        )
        table = BenchmarkUtils.dataframe_to_table("my_view", orig_df)
        exp_scores = [[0.7, 0.8], [0.6, 0.9], [0.5, 0.0]]
        self.assertDeepAlmostEqual(exp_scores, table.scores)
