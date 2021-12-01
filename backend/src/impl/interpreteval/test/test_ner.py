import unittest
import os
import sys
import numpy as np
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../processors')))

import inspect
import feature
from processors.ner import *






class TestStringMethods(unittest.TestCase):

    def test_ner_eval(self):
        this_function_name = inspect.currentframe().f_code.co_name
        print(f"\n----------------{this_function_name}----------------")

        # dict_info = {"task_name":"ner", "model_name":"bert", "dataset_name":"conll03", "metric_names": ["f1_score_seqeval"]}
        # ner_eb = ner_processor(path_output_file="../data/test-ner.tsv", path_report="./", dict_info=dict_info, path_pre_computed_models="../pre_computed/ner/conll2003")
        path_output_file = "../data/test-ner.tsv"
        path_report = "./"
        dict_info = {"task_name":"ner", "model_name":"bert", "dataset_name":"conll03", "metric_names": ["f1_score_seqeval"]}
        processor(path_output_file, path_report, dict_info, path_pre_computed_models="../pre_computed/ner/conll2003")






if __name__ == '__main__':
    unittest.main()
