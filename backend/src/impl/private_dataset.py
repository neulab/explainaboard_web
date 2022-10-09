from explainaboard import DatalabLoaderOption

PRIVATE_DATASETS = [
    DatalabLoaderOption("fig_qa", None, "test"),
    DatalabLoaderOption("cmu_anlp", "sst", "test"),
    DatalabLoaderOption("cmu_anlp", "cfimdb", "test"),
    DatalabLoaderOption("fudan_nlp", "movie_review", "test"),
    DatalabLoaderOption("fudan_nlp", "conll2003", "test"),
]

_private_dataset_lookup = set(
    (dataset.dataset, dataset.subdataset, dataset.split) for dataset in PRIVATE_DATASETS
)


def is_private_dataset(dataset: DatalabLoaderOption):
    return (
        dataset.dataset,
        dataset.subdataset,
        dataset.split,
    ) in _private_dataset_lookup
