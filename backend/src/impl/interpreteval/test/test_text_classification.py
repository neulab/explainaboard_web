import unittest
import os
import sys
import numpy as np
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../processors')))

import inspect
import feature
from processors.text_classification import *
from loader.loader import *





class TestStringMethods(unittest.TestCase):

    def test_reformat_system_output_from_tsv(self):
        path_system_output = "../data/test-classification.tsv"
        task_name = 'text_classification'
        file_format = 'tsv'

        builder = loader_registry[task_name][file_format]()
        system_output_dict = builder.load(path_system_output=path_system_output).system_output # system_output_dict:List[Dict]
        print(system_output_dict)
        system_output_json = builder.load(path_system_output=path_system_output).to_json().system_output # system_output_dict:JSON
        print(system_output_json)

    def test_reformat_system_output_from_jsonl(self):
        path_system_output = "../data/test-classification.jsonl"
        task_name = 'text_classification'
        file_format = 'jsonl'

        builder = loader_registry[task_name][file_format]()
        system_output_dict = builder.load(path_system_output=path_system_output).system_output # system_output_dict:List[Dict]
        print(system_output_dict)
        system_output_json = builder.load(path_system_output=path_system_output).to_json().system_output # system_output_dict:JSON
        print(system_output_json)


    def test_generate_system_analysis_from_formatted_object(self):
        formatted_system_output = [
            {"id": 0, "text": "eight legged freaks falls flat as a spoof .", "true_label": "0",
             "predicted_label": "0"},
            {"id": 1, "text": "renner 's performance as dahmer is unforgettable , deeply absorbing .",
             "true_label": "1", "predicted_label": "1"},
            {"id": 391, "text": "i liked a lot of the smaller scenes .", "true_label": "1", "predicted_label": "0"}
        ]
        path_system_analysis = "./"
        metadata_info = {"task_name": "text_classification",
                         "metric_names": ["Accuracy", "F1score"]}


        processor(metadata = metadata_info, formatted_system_output = formatted_system_output, path_report = path_system_analysis)


    def test_generate_system_analysis_from_tsv(self):


        path_system_output = "../data/test-classification.tsv"
        file_format = "tsv"
        path_system_analysis = "./"
        metadata_info = {"task_name": "text_classification",
                         "metric_names": ["Accuracy", "F1score"]}


        processor(metadata = metadata_info, path_system_output = path_system_output, file_format = file_format, path_report = path_system_analysis)





if __name__ == '__main__':
    unittest.main()
