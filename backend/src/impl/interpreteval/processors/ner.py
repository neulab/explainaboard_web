import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../builders/')))
from builders.ner import NERExplainaboardBuilder
from config import BuilderConfig
import feature
from info import SysOutputInfo



def processor(path_output_file:str, path_report:str, dict_info:dict, path_pre_computed_models:str):
    """
    :param path_report: path of analysis report
    :param path_output_file: path of system output file
    :param dict_info: for example: {"model_name":"BERT", "dataset_name":"conll03", "metric_names":["Accuracy", "F1score"]}
    :return:
    """


    # Initialize features
    features = feature.Features({
        "tokens": feature.Sequence(feature.Value("string")),
        "ner_true_tags":feature.Sequence(feature.ClassLabel(names=[
            "O",
            "B-PER",
            "I-PER",
            "B-ORG",
            "I-ORG",
            "B-LOC",
            "I-LOC",
            "B-MISC",
            "I-MISC",
        ])),
        "ner_pred_tags": feature.Sequence(feature.ClassLabel(names=[
            "O",
            "B-PER",
            "I-PER",
            "B-ORG",
            "I-ORG",
            "B-LOC",
            "I-LOC",
            "B-MISC",
            "I-MISC",
        ])),
        "sentence_length": feature.Value(dtype="float",
                                         is_bucket=True,
                                         bucket_info=feature.BucketInfo(
                                             _method="bucket_attribute_specified_bucket_value",
                                             _number=4,
                                             _setting=())),
        "true_entity_info":feature.Sequence(feature.Set({
            "span_text":feature.Value("string"),
            "span_len":feature.Value(dtype="float",
                                         is_bucket=True,
                                         bucket_info=feature.BucketInfo(
                                             _method="bucket_attribute_specified_bucket_value",
                                             _number=4,
                                             _setting=())),
            "span_pos":feature.Position(positions=[0,0]),
            "span_tag":feature.Value("string"),
            "eCon":feature.Value(dtype="float",
                                         is_bucket=True,
                                         is_pre_computed=True,
                                         bucket_info=feature.BucketInfo(
                                             _method="bucket_attribute_specified_bucket_value",
                                             _number=4,
                                             _setting=())),
            "eFre":feature.Value(dtype="float",
                                         is_bucket=True,
                                         is_pre_computed=True,
                                         bucket_info=feature.BucketInfo(
                                             _method="bucket_attribute_specified_bucket_value",
                                             _number=4,
                                             _setting=())),
        }))
    })


    dict_info["features"] = features

    sys_output_info = SysOutputInfo.from_dict(dict_info)
    print(sys_output_info.features.get_bucket_features())

    ner_explainaboard = NERExplainaboardBuilder(
                                        info=sys_output_info,
                                        build_config = BuilderConfig(path_report = path_report,
                                                        path_output_file= path_output_file),
                                        path_pre_computed_models = path_pre_computed_models)
    ner_explainaboard.run()
    # print(sys_output_info)
    # print(" ")
    #
    # print(sys_output_info.features["true_entity_info"].__dict__.keys())
    # print(sys_output_info.features["true_entity_info"].feature.feature)
    #

#
# dict_info = {"task_name":"ner", "model_name":"bert", "dataset_name":"conll03", "metric_names": ["f1_score_seqeval"]}
# ner_eb = processor(path_output_file="../data/test-ner.tsv", path_report="./", dict_info=dict_info, path_pre_computed_models="../pre_computed/ner/conll2003")
#


