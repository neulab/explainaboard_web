import unittest

class TestResultApi(unittest.TestCase):

    ####################### Utility Functions ##########################

    def _setup_empty_mock_database(self):
        # Setup a database with no entries
        raise NotImplementedError()

    def _setup_populated_mock_database(self):
        # Setup a database
        self._setup_empty_mock_database()
        # Add a few entries directly
        raise NotImplementedError()

    def _cleanup_mock_database(self):
        # Shut down and delete the mock database
        raise NotImplementedError()

    ####################### Tests ##########################

    def test_post_and_list_results(self):
        # 1. Create an empty mock database
        self._setup_empty_mock_database()
        # 2. Use the /result post API to add results
        raise NotImplementedError()
        # 3. List the results using the /results API
        raise NotImplementedError()
        # 4. Make sure that the two sets of results are equal
        raise NotImplementedError()
        # 5. Clean up
        self._cleanup_mock_database()
