from __future__ import annotations

from typing import Any, Union
from explainaboard.models.lb_result import LbResult
from explainaboard.models.dataset import Dataset  # noqa: E501
from explainaboard.models.datasets import Datasets  # noqa: E501
from explainaboard.models.lb_results import LbResults  # noqa: E501
from explainaboard.models.result import Result  # noqa: E501
from explainaboard.models.results import Results  # noqa: E501
from explainaboard.impl.db import get_db


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


class DBModel:
    collection_name: str


class LeaderBoard_NER(LbResult, DBModel):
    collection_name = 'leaderboard_ner'

    @classmethod
    def from_db_object(cls, db_object: Any) -> LeaderBoard_NER:
        obj = {**db_object}
        return cls.from_dict(obj)

    @classmethod
    def find_one(cls) -> Union[LeaderBoard_NER, None]:
        document = get_db(
        ).cx.explainaboard_dev[cls.collection_name].find_one()
        if document:
            return cls.from_db_object(document)
        return None

    def write_to_db(self):
        pass


def lb_results_get(task_id=None, dataset_id=None) -> LbResults:
    lb_result = LeaderBoard_NER.find_one()
    if lb_result:
        return lb_result
