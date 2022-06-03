import os
import pathlib
from unittest import TestCase

import numpy as np
import pandas as pd
from explainaboard_web.impl.benchmark_utils import BenchmarkUtils


class TestDatasetInfo(TestCase):
    @staticmethod
    def _config_path():
        return os.path.join(
            os.path.dirname(pathlib.Path(__file__)),
            os.path.pardir,
            "impl",
            "tests",
            "artifacts",
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

    def test_miniglue_aggregate(self):

        json_file = os.path.join(TestDatasetInfo._config_path(), "config_miniglue.json")
        config = BenchmarkUtils.config_from_json_file(json_file)
        orig_df = pd.DataFrame(
            {
                "dataset_name": ["sst2", "sst2", "snli", "sst2", "sst2", "snli"],
                "task": [
                    "text-classification",
                    "text-classification",
                    "natural-language-inference",
                    "text-classification",
                    "text-classification",
                    "natural-language-inference",
                ],
                "system_name": ["sys1", "sys1", "sys1", "sys2", "sys2", "sys2"],
                "metric": ["Accuracy", "F1", "Accuracy", "Accuracy", "F1", "Accuracy"],
                "metric_weight": [0.8, 0.2, 1.0, 0.8, 0.2, 1.0],
                "score": [0.7, 0.6, 0.5, 0.8, 0.9, 0.0],
            }
        )
        view_dfs = BenchmarkUtils.generate_view_dataframes(config, orig_df)
        mean_df = pd.DataFrame(
            {
                "system_name": ["sys1", "sys2"],
                "score": [
                    (0.7 * 0.8 + 0.6 * 0.2) * 0.5 + 0.5 * 0.5,
                    (0.8 * 0.8 + 0.9 * 0.2) * 0.5,
                ],
            }
        )
        task_weighted_df = pd.DataFrame(
            {
                "system_name": ["sys1", "sys2"],
                "score": [
                    (0.7 * 0.8 + 0.6 * 0.2) * 0.7 + 0.5 * 0.3,
                    (0.8 * 0.8 + 0.9 * 0.2) * 0.7,
                ],
            }
        )
        taskwise_df = pd.DataFrame(
            {
                "system_name": ["sys1", "sys1", "sys2", "sys2"],
                "task": [
                    "natural-language-inference",
                    "text-classification",
                    "natural-language-inference",
                    "text-classification",
                ],
                "score": [0.5, (0.7 * 0.8 + 0.6 * 0.2), 0.0, (0.8 * 0.8 + 0.9 * 0.2)],
            }
        )

        self.assertEqual(mean_df.to_dict(), view_dfs[0][1].to_dict())
        self.assertEqual(task_weighted_df.to_dict(), view_dfs[1][1].to_dict())
        self.assertEqual(taskwise_df.to_dict(), view_dfs[2][1].to_dict())
        self.assertEqual(orig_df.to_dict(), view_dfs[3][1].to_dict())

    def test_gaokao_aggregate(self):

        json_file = os.path.join(
            TestDatasetInfo._config_path(), "config_gaokao_test.json"
        )
        config = BenchmarkUtils.config_from_json_file(json_file)
        orig_df = pd.DataFrame(
            {
                "dataset_name": ["sst2", "sst2", "snli", "sst2", "sst2", "snli"],
                "task": [
                    "text-classification",
                    "text-classification",
                    "natural-language-inference",
                    "text-classification",
                    "text-classification",
                    "natural-language-inference",
                ],
                "system_name": ["sys1", "sys1", "sys1", "sys2", "sys2", "sys2"],
                "metric": ["Accuracy", "F1", "Accuracy", "Accuracy", "F1", "Accuracy"],
                "score": [0.7, 0.6, 0.5, 0.8, 0.9, 0.0],
            }
        )
        view_dfs = BenchmarkUtils.generate_view_dataframes(config, orig_df)
        mean_df = pd.DataFrame(
            {
                "system_name": ["sys1", "sys2"],
                "score": [
                    (0.7 * 0.5 + 0.6 * 0.5) * 0.5 + 0.5 * 0.5,
                    (0.8 * 0.5 + 0.9 * 0.5) * 0.5,
                ],
            }
        )
        taskwise_df = pd.DataFrame(
            {
                "system_name": ["sys1", "sys1", "sys2", "sys2"],
                "task": [
                    "natural-language-inference",
                    "text-classification",
                    "natural-language-inference",
                    "text-classification",
                ],
                "score": [0.5, (0.7 * 0.5 + 0.6 * 0.5), 0.0, (0.8 * 0.5 + 0.9 * 0.5)],
            }
        )

        self.assertDeepAlmostEqual(mean_df.to_dict(), view_dfs[0][1].to_dict())
        self.assertDeepAlmostEqual(taskwise_df.to_dict(), view_dfs[1][1].to_dict())
        self.assertDeepAlmostEqual(orig_df.to_dict(), view_dfs[2][1].to_dict())

    def test_masakhaner_aggregate(self):

        json_file = os.path.join(
            TestDatasetInfo._config_path(), "config_masakhaner.json"
        )
        config = BenchmarkUtils.config_from_json_file(json_file)

        sub_datasets = [
            "masakhaner-bam",
            "masakhaner-bbj",
            "masakhaner-ewe",
            "masakhaner-fon",
            "masakhaner-hau",
            "masakhaner-ibo",
            "masakhaner-kin",
            "masakhaner-lug",
            "masakhaner-mos",
            "masakhaner-nya",
            "masakhaner-pcm",
            "masakhaner-sna",
            "masakhaner-swa",
            "masakhaner-tsn",
            "masakhaner-twi",
            "masakhaner-wol",
            "masakhaner-xho",
            "masakhaner-yor",
            "masakhaner-zul",
        ]
        pop_weights = [
            0.05751919466882523,
            0.0014379798667206306,
            0.015694523116779453,
            0.004889131546850144,
            0.13763521581468893,
            0.07395325028848958,
            0.043550247392110525,
            0.026951851216249535,
            0.026130148435266315,
            0.02670534038195457,
            0.12325541714748263,
            0.036812284588048146,
            0.06570750396646204,
            0.007641835863143923,
            0.0373874765347364,
            0.021405357444612815,
            0.07867804127914307,
            0.08586794061274623,
            0.11216242960420919,
        ]
        np_pop_weight = np.array(pop_weights)
        all_systems = ["sys1" for _ in sub_datasets] + ["sys2" for _ in sub_datasets]
        all_metrics = ["F1" for _ in sub_datasets] + ["F1" for _ in sub_datasets]
        all_dataset_names = ["masakhaner" for _ in sub_datasets] + [
            "masakhaner" for _ in sub_datasets
        ]
        all_sub_datasets = sub_datasets + sub_datasets
        all_pop_weights = pop_weights + pop_weights
        np_sys1_f1s = np.random.rand(len(sub_datasets))
        np_sys2_f1s = np.random.rand(len(sub_datasets))
        all_f1s = list(np_sys1_f1s) + list(np_sys2_f1s)

        orig_df = pd.DataFrame(
            {
                "dataset_name": all_dataset_names,
                "sub_dataset": all_sub_datasets,
                "system_name": all_systems,
                "pop_weight": all_pop_weights,
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
