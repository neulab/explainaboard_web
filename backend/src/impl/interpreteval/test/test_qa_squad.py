import unittest
import os
import sys
import numpy as np
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../processors')))

import inspect
import feature
from processors.qa_squad import *






class TestStringMethods(unittest.TestCase):

    def test_ner_eval(self):
        this_function_name = inspect.currentframe().f_code.co_name
        print(f"\n----------------{this_function_name}----------------")

        path_test_set = "../data/qa/testset-en.json"
        path_output_file = "../data/qa/output-en.json"
        path_report = "./"
        dict_info = {"task_name":"qa", "model_name": "BERT", "dataset_name": "sqaud", "metric_names": ["f1_score_qa","exact_match_qa"]}
        processor(path_test_set, path_output_file, path_report, dict_info)


if __name__ == '__main__':
    unittest.main()
