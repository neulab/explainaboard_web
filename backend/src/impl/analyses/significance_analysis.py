import numpy as np
from explainaboard.info import SysOutputInfo
from explainaboard.metrics.metric import MetricStats
from explainaboard.metrics.registry import get_metric_config_class
from explainaboard.utils.typing_utils import unwrap


def update_metric_config(system_output: SysOutputInfo) -> SysOutputInfo:
    metric_configs = [
        get_metric_config_class(metric_config_dict["cls_name"])(**metric_config_dict)
        for metric_config_dict in system_output.metric_configs
    ]
    # update metric_configs in system_output
    system_output.metric_configs = metric_configs

    return system_output


"""
significance test based on bootstrapped resampling method, which are
controlled by two major
hyper-parameters:
(1) n_samples: The number of bootstrapped samples
(2) prop_samples: The ratio of samples to take every time

"""


def significance_test(
    sys1_info: SysOutputInfo,
    sys2_info: SysOutputInfo,
    sys1_metric_stats: MetricStats,
    sys2_metric_stats: MetricStats,
    n_samples: int = 1000,
    prop_samples: float = 0.5,
) -> dict:

    sys1_metric_names = []
    sys2_metric_names = []
    metric_funcs = []
    sig_info = {}

    for config in unwrap(sys1_info.metric_configs):
        sys1_metric_names.append(config.name)
        metric_funcs.append(config.to_metric())
    for config in unwrap(sys2_info.metric_configs):
        sys2_metric_names.append(config.name)

    # metric validation
    if sys1_metric_names != sys2_metric_names:
        raise ValueError(
            f"Evaluation metrics of two system should be with the same "
            f"name and same order: {sys1_metric_names},"
            f"{sys2_metric_names}"
        )

    for sys1_metric_stat, sys2_metric_stat, metric_func, metric_name in zip(
        sys1_metric_stats, sys2_metric_stats, metric_funcs, sys1_metric_names
    ):

        n_elems = max(int(prop_samples * len(sys1_metric_stat)), 1)
        all_indices = np.array(range(len(sys1_metric_stat)))
        rng = np.random.default_rng()
        all_indices = rng.choice(all_indices, size=(n_samples, n_elems), replace=True)
        # Get sampling examples
        sys1_filt_stats = sys1_metric_stat.filter(all_indices)
        sys2_filt_stats = sys2_metric_stat.filter(all_indices)

        # Calculating performance for system 1
        sys1_agg_stats = metric_func.aggregate_stats(sys1_filt_stats)
        sys1_samp_results = metric_func.calc_metric_from_aggregate(
            sys1_agg_stats, config
        )
        # Calculating performance for system 2
        sys2_agg_stats = metric_func.aggregate_stats(sys2_filt_stats)
        sys2_samp_results = metric_func.calc_metric_from_aggregate(
            sys2_agg_stats, config
        )

        # Judge which system wins based on their performance in each sampling round
        wins = [0.0, 0.0, 0.0]
        for sys1_score, sys2_score in zip(sys1_samp_results, sys2_samp_results):
            if sys1_score > sys2_score:
                wins[0] += 1
            elif sys1_score < sys2_score:
                wins[1] += 1
            else:
                wins[2] += 1

        # Get system names
        sys1_name = (
            "system1" if sys1_info.system_name is None else sys1_info.system_name
        )
        sys2_name = (
            "system2" if sys2_info.system_name is None else sys2_info.system_name
        )

        for i in range(len(wins)):
            wins[i] = wins[i] * 1.0 / n_samples
        description = (
            f"{sys1_name} is superior to {sys2_name} with p-value: "
            f"{format(1 - wins[0],'.4f')}"
            if wins[0] > wins[1]
            else f"{sys2_name} is superior to {sys1_name}  with "
            f"p-value: {format(1 - wins[1],'.4f')}"
        ) + " (Note that p < 0.05 represents statistical significance)"

        # Save relevant information
        sig_info[metric_name] = {
            "win_ratio": {sys1_name: wins[0], sys2_name: wins[1]},
            "description": description,
            "method": "bootstrapping method with sampling rate: "
            + str(prop_samples)
            + ", and sample size: "
            + str(n_samples),
        }
    return sig_info
