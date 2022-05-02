from unittest import TestCase

from backend.src.impl.dataset_info import DatasetCollection


class TestDatasetInfo(TestCase):
    def test_load_info(self):
        dataset_collection = DatasetCollection.get_dataset_collection()
        self.assertGreater(len(dataset_collection), 0)

    def test_find_by_name(self):
        dataset_info = DatasetCollection.find_dataset_info(dataset_name="cnewsum")
        self.assertEqual(len(dataset_info), 1)
        self.assertEqual(dataset_info[0].dataset_class_name, "CNewSumDataset")

    def test_find_by_task(self):
        dataset_info = DatasetCollection.find_dataset_info(
            task="named-entity-recognition"
        )
        ner_datasets = {"masakhaner", "ontonotes_ner", "wnut_17"}
        not_ner_datasets = {"cnewsum", "conala"}
        found_datasets = {x.name: x for x in dataset_info}
        for x in ner_datasets:
            self.assertTrue(x in found_datasets, msg=f"{x} not found in NER datasets")
        for x in not_ner_datasets:
            self.assertTrue(x not in found_datasets, msg=f"{x} found in NER datasets")

    def test_find_by_page(self):
        page_size = 5
        all_dataset_info = DatasetCollection.find_dataset_info(task="summarization")
        all_len = len(all_dataset_info)
        remainder_page = int(all_len / page_size) + 1
        for i in range(1, remainder_page + 2):
            page_dataset_info = DatasetCollection.find_dataset_info(
                task="summarization", page=i, page_size=page_size
            )
            if i < remainder_page:
                self.assertEqual(len(page_dataset_info), page_size)
            elif i == remainder_page:
                self.assertEqual(
                    len(page_dataset_info), len(all_dataset_info) % page_size
                )
            else:
                self.assertEqual(len(page_dataset_info), 0)
