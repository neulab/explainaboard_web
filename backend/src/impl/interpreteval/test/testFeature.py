import unittest
import os
from os import sys, path
import numpy as np
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../utils')))

from feature import ClassLabel, Features
import feature
from info import SysOutputInfo
from py_utils import zip_dict
import inspect

class TestStringMethods(unittest.TestCase):

    def test_ClassLabel(self):
        this_function_name = inspect.currentframe().f_code.co_name
        print(f"\n----------------{this_function_name}----------------")
        cl = ClassLabel(names=["pos","neg"])
        print(f"the classLabel instance is {cl}")
        self.assertEqual(cl.names, ["pos","neg"])

    def test_Features(self):
        this_function_name = inspect.currentframe().f_code.co_name
        print(f"\n----------------{this_function_name}----------------")
        feature_meta_info = Features({
            "sentence":feature.Value(dtype = "string"),
            "label":ClassLabel(names=["pos","neg"]),
            "sent_length":feature.Value(dtype = "float", is_bucket = "True"),
        })
        print(f"if the type of feature equals dict {isinstance(feature_meta_info, dict)}")
        print(feature_meta_info.sentence)
        print(feature_meta_info.sent_length)
        print(feature_meta_info.label)
        # print(feature_meta_info["label"].names)
        self.assertEqual(feature_meta_info, feature_meta_info)

    def test_SysOutputInfo(self):
        this_function_name = inspect.currentframe().f_code.co_name
        print(f"\n----------------{this_function_name}----------------")
        sys_output_info = SysOutputInfo(model_name="BERT", dataset_name="conll03")
        print(sys_output_info)

        sys_output_info.write_to_directory("./")

        sys_output_info2 = SysOutputInfo.from_directory("./")
        print(f"system_outut_info2:\t {sys_output_info2}")


    def test_cast_to_python_objects(self):
        this_function_name = inspect.currentframe().f_code.co_name
        print(f"\n----------------{this_function_name}----------------")
        test_obj  = {"a":1, "b":2, "c":3}
        test_obj2 = [1,2,3,4]
        test_obj3 = [1,[1,2,3],[1,2],[1,[1,[1]]]]
        test_obj4 = np.array([[1,2,3],[4,5,6]])
        res = feature._cast_to_python_objects(test_obj4, True)
        print(f"The result of cast is {res}")

    def test_zip_dict(self):
        this_function_name = inspect.currentframe().f_code.co_name
        print(f"\n----------------{this_function_name}----------------")
        dict1 = {"sent":"str", "label":"str", "length":"float"}
        dict2 = {"sent":"This is a good movie", "label":"positive", "length":5}
        res_dict_iter = zip_dict(dict1, dict2)
        print(f"The zipped res_dict is")
        for k,v in res_dict_iter:
            print(k,v)


if __name__ == '__main__':
    unittest.main()
