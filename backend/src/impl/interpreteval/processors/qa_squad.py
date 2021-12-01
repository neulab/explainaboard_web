import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../builders/')))
from builders.qa_squad import QASquadExplainaboardBuilder
from config import BuilderConfig
import feature
from info import SysOutputInfo





def processor(path_test_set:str, path_output_file:str, path_report:str, dict_info:dict):
    """
    :param: path_test_set: path of test set
    :param path_output_file: path of system output file
    :param path_report: path of analysis report
    :param dict_info: for example: {"model_name":"BERT", "dataset_name":"conll03", "metric_names":["Accuracy", "F1score"]}
    :return:
    """


    # Initialize features
    features = feature.Features({
        "title": feature.Value("string"),
        "context": feature.Value("string"),
        "question": feature.Value("string"),
        "id": feature.Value("string"),
        "true_answers": feature.Sequence(feature.Value("string")),
        "predicted_answer":feature.Value("string"),
        "context_length": feature.Value(dtype="float",
                                         is_bucket=True,
                                         bucket_info=feature.BucketInfo(
                                             _method="bucket_attribute_specified_bucket_value",
                                             _number=4,
                                             _setting=())),
        "question_length": feature.Value(dtype="float",
                                      is_bucket=True,
                                      bucket_info=feature.BucketInfo(
                                          _method="bucket_attribute_specified_bucket_value",
                                          _number=4,
                                          _setting=())),
        "answer_length": feature.Value(dtype="float",
                                         is_bucket=True,
                                         bucket_info=feature.BucketInfo(
                                             _method="bucket_attribute_specified_bucket_value",
                                             _number=4,
                                             _setting=())),
        "sim_context_question": feature.Value(dtype="float",
                                       is_bucket=True,
                                       bucket_info=feature.BucketInfo(
                                           _method="bucket_attribute_specified_bucket_value",
                                           _number=4,
                                           _setting=()))
    })
    dict_info["features"] = features

    sys_output_info = SysOutputInfo.from_dict(dict_info)
    print(sys_output_info)



    qa_explainaboard = QASquadExplainaboardBuilder(
                                        info=sys_output_info,
                                        build_config = BuilderConfig(path_report = path_report,
                                                                     path_test_set= path_test_set,
                                                                     path_output_file= path_output_file))
    qa_explainaboard.run()


# path_test_set = "../data/qa/testset-en.json"
# path_output_file = "../data/qa/output-en.json"
# path_report = "./"
# dict_info = {"task_name":"qa", "model_name": "BERT", "dataset_name": "sqaud", "metric_names": ["f1_score_qa","exact_match_qa"]}
# processor(path_test_set, path_output_file, path_report, dict_info)



