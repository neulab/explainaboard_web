import unittest

class TestDatasetApi(unittest.TestCase):

    ####################### Utility Functions ##########################

    def _setup_mock_database(self):
        # Setup a dataset with a couple fake datasets
        raise NotImplementedError()
        

    def _cleanup_mock_database(self):
        # Shut down and delete the mock database
        raise NotImplementedError()

    ####################### Tests ##########################

    def test_list_datasets(self):
        # 1. Add two datasets to a mock database
        self._setup_mock_database()
        # 2. List the datasets using the /datasets API
        raise NotImplementedError()
        # 3. Make sure that the two sets of datasets are equal
        raise NotImplementedError()
        # 4. Clean up
        self._cleanup_mock_database()

    def test_get_single_dataset(self):
        # 1. Add two datasets to a mock database
        self._setup_mock_database()
        # 2. Get one of the datasets using the /datasets/{dataset_id} API
        raise NotImplementedError()
        # 3. Make sure that the retrieved dataset
        raise NotImplementedError()
        # 4. Clean up
        self._cleanup_mock_database()
