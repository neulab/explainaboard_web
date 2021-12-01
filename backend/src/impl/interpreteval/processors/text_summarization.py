import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../builders/')))
from builders.text_summarization import SummExplainaboardBuilder
from config import BuilderConfig
import feature
from info import SysOutputInfo




def processor(path_output_file:str, path_report:str, dict_info:dict):
    """
    :param path_report: path of analysis report
    :param path_output_file: path of system output file
    :param dict_info: for example: {"model_name":"BERT", "dataset_name":"conll03", "metric_names":["Accuracy", "F1score"]}
    :return:
    """


    # Initialize features
    features = feature.Features({
        "source": feature.Value("string"),
        "reference": feature.Value("string"),
        "hypothesis": feature.Value("string"),
        "attr_source_len": feature.Value(dtype="float",
                                         is_bucket=True,
                                         bucket_info=feature.BucketInfo(
                                             _method="bucket_attribute_specified_bucket_value",
                                             _number=4,
                                             _setting=())),
        "attr_compression": feature.Value(dtype="float",
                                         is_bucket=True,
                                         bucket_info=feature.BucketInfo(
                                             _method="bucket_attribute_specified_bucket_value",
                                             _number=4,
                                             _setting=())),
        "attr_copy_len": feature.Value(dtype="float",
                                          is_bucket=True,
                                          bucket_info=feature.BucketInfo(
                                              _method="bucket_attribute_specified_bucket_value",
                                              _number=4,
                                              _setting=())),
        "attr_coverage": feature.Value(dtype="float",
                                       is_bucket=True,
                                       bucket_info=feature.BucketInfo(
                                           _method="bucket_attribute_specified_bucket_value",
                                           _number=4,
                                           _setting=())),
        "attr_novelty": feature.Value(dtype="float",
                                       is_bucket=True,
                                       bucket_info=feature.BucketInfo(
                                           _method="bucket_attribute_specified_bucket_value",
                                           _number=4,
                                           _setting=()))

    })
    dict_info["features"] = features

    sys_output_info = SysOutputInfo.from_dict(dict_info)




    tc_explainaboard = SummExplainaboardBuilder(
                                        info=sys_output_info,
                                        build_config = BuilderConfig(path_report = path_report,
                                                        path_output_file= path_output_file))



    tc_explainaboard.run()







