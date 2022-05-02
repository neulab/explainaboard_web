from unittest import TestCase

from backend.src.impl.dataset_info import DatasetInfo


class TestDatasetInfo(TestCase):
    def test_load_info(self):
        dataset_info = DatasetInfo.get_dataset_info()
        self.assertGreater(len(dataset_info), 0)
