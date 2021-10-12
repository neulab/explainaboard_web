# Data models are copied from default_controllers.py in gen/
# TODO is this dirty? is there a cleaner way?
from explainaboard.models.dataset import Dataset  # noqa: E501
from explainaboard.models.datasets import Datasets  # noqa: E501
from explainaboard.models.lb_results import LbResults  # noqa: E501
from explainaboard.models.result import Result  # noqa: E501
from explainaboard.models.results import Results  # noqa: E501

def _create_mock_dataset(dataset_id):
    mock_dataset = Dataset()
    for attribute_name, type_ in mock_dataset.swagger_types.items():
        if type_ == int:
            val = type_(dataset_id)
        elif type_ == str:
            val = type_(attribute_name + ' mock data')
        else:
            val = type_()
        setattr(mock_dataset, attribute_name, val)
    return mock_dataset

def _create_mock_datasets():
    mock_datasets = Datasets()
    setattr(mock_datasets, 'payload', [])
    for i in range(5):
        mock_datasets.payload.append(_create_mock_dataset(i))
    return mock_datasets

def datasets_dataset_id_get(dataset_id):
    return _create_mock_dataset(dataset_id)

def datasets_get():
    return _create_mock_datasets()