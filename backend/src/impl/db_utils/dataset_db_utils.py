from typing import Any, Optional

from bson import ObjectId
from explainaboard_web.impl.db_utils.db_utils import DBUtils
from explainaboard_web.models import DatasetMetadata, DatasetsReturn


class DatasetDBUtils:
    @staticmethod
    def find_datasets(
        page: int,
        page_size: int,
        dataset_ids: Optional[list[str]] = None,
        dataset_name: Optional[str] = None,
        task: Optional[str] = None,
        no_limit: bool = False,
    ) -> DatasetsReturn:
        """
        fuzzy match works like a `LIKE {name_prefix}%` operation now. can extend this
        and allow for full text search in the future.
          - `no_limit=True` ignores page and page_size to retrieve unlimited records.
            This option should not be exposed to users.
        """
        filt: dict[str, Any] = {}
        if dataset_ids is not None:
            filt["_id"] = {"$in": [ObjectId(_id) for _id in dataset_ids]}
        if dataset_name is not None:
            filt["dataset_name"] = {"$regex": rf"^{dataset_name}.*"}
        if task:
            filt["tasks"] = task
        if no_limit:
            # limit=0 means no limit in pymongo
            cursor, total = DBUtils.find(DBUtils.DATASET_METADATA, filt, limit=0)
        else:
            cursor, total = DBUtils.find(
                DBUtils.DATASET_METADATA, filt, [], page * page_size, page_size
            )
        dataset_list = []
        for doc in cursor:
            doc["dataset_id"] = doc.pop("_id")
            dataset_list.append(DatasetMetadata.from_dict(doc))
        return DatasetsReturn(dataset_list, total)
