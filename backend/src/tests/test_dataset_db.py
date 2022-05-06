from unittest import TestCase

from explainaboard_web.impl.db_utils.dataset_db_utils import DatasetDBUtils


class TestDatasetInfo(TestCase):
    def test_load_info(self):
        dataset_collection = DatasetDBUtils.get_dataset_db()
        self.assertGreater(len(dataset_collection.metadatas), 0)

    def test_find_by_name(self):
        dataset_info = DatasetDBUtils.find_datasets(dataset_name="cnewsum")
        self.assertEqual(len(dataset_info.datasets), 1)
        self.assertTrue("summarization" in dataset_info.datasets[0].tasks)

    def test_find_by_task(self):
        dataset_info = DatasetDBUtils.find_datasets(task="named-entity-recognition")
        ner_datasets = {"masakhaner", "ontonotes_ner", "wnut_17"}
        not_ner_datasets = {"cnewsum", "conala"}
        found_datasets = {x.dataset_name: x for x in dataset_info.datasets}
        for x in ner_datasets:
            self.assertTrue(x in found_datasets, msg=f"{x} not found in NER datasets")
        for x in not_ner_datasets:
            self.assertTrue(x not in found_datasets, msg=f"{x} found in NER datasets")

    def test_find_by_page(self):
        page_size = 5
        all_dataset_info = DatasetDBUtils.find_datasets(task="summarization")
        all_len = len(all_dataset_info.datasets)
        remainder_page = int(all_len / page_size)
        for i in range(0, remainder_page + 2):
            page_dataset_info = DatasetDBUtils.find_datasets(
                task="summarization", page=i, page_size=page_size
            )
            if i < remainder_page:
                self.assertEqual(len(page_dataset_info.datasets), page_size)
            elif i == remainder_page:
                self.assertEqual(len(page_dataset_info.datasets), all_len % page_size)
            else:
                self.assertEqual(len(page_dataset_info.datasets), 0)
