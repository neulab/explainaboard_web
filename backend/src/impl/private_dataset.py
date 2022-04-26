from dataclasses import astuple

from explainaboard import DatalabLoaderOption

PRIVATE_DATASETS = [DatalabLoaderOption("fig_qa", None, "test")]

_private_dataset_lookup = set(astuple(dataset) for dataset in PRIVATE_DATASETS)


def is_private_dataset(dataset: DatalabLoaderOption):
    return astuple(dataset) in _private_dataset_lookup
