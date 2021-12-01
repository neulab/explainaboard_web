import unittest
import os
import sys
import numpy as np
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../processors')))

import inspect
import feature

from processors.text_summarization import *






class TestStringMethods(unittest.TestCase):

    def test_tc_generate_sample(self):
        this_function_name = inspect.currentframe().f_code.co_name
        print(f"\n----------------{this_function_name}----------------")

        path_output_file = "../data/test-summ.tsv"
        path_report = "./"
        dict_info = {"task_name":"text_summarization", "model_name": "BERT", "dataset_name": "cnn_dailymain", "metric_names": ["bart_score_summ"]}

        processor(path_output_file, path_report, dict_info)




if __name__ == '__main__':
    unittest.main()
