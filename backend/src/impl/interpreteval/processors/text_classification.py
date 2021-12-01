import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../builders/')))
from builders.text_classification import TCExplainaboardBuilder
from config import BuilderConfig
import feature
from info import SysOutputInfo



# def processor(path_output_file:str, path_report:str, dict_info:dict):
def processor(metadata:dict = None,
              path_system_output:str = None,
              file_format = "tsv",
              formatted_system_output:any = None,
              path_report:str = None):
    """
    :param path_report: path of analysis report
    :param path_system_output: path of system output file
    :param file_format: the format of path_system_output: tsv|jsonl;
           this need to be specified only when path_system_output is specified (i.e., path_system_output is not None)
    :param metadata: for example: {"model_name":"BERT", "dataset_name":"conll03", "metric_names":["Accuracy", "F1score"]}
    :param formatted_system_output: formatted system output (List[dict] or JSON)
    :return:
    """


    # Initialize features
    features = feature.Features({
        "text": feature.Value("string"),
        "true_label": feature.ClassLabel(names=[
                                                "1",
                                                "0"
                                                ], is_bucket=False),
        "predicted_label": feature.ClassLabel(names=[
                                                     "1",
                                                     "0"
                                                     ], is_bucket=False),
        "label": feature.Value(dtype="string",
                               is_bucket=True,
                               bucket_info=feature.BucketInfo(
                                   _method="bucket_attribute_discrete_value",
                                   _number=4,
                                   _setting=1)),
        "sentence_length": feature.Value(dtype="float",
                                         is_bucket=True,
                                         bucket_info=feature.BucketInfo(
                                             _method="bucket_attribute_specified_bucket_value",
                                             _number=4,
                                             _setting=())),
        "token_number": feature.Value(dtype="float",
                                      is_bucket=True,
                                      bucket_info=feature.BucketInfo(
                                          _method="bucket_attribute_specified_bucket_value",
                                          _number=4,
                                          _setting=())),

    })
    metadata["features"] = features

    sys_output_info = SysOutputInfo.from_dict(metadata)


    tc_explainaboard = TCExplainaboardBuilder(
                                        info=sys_output_info,
                                        build_config = BuilderConfig(path_report = path_report,
                                                                     path_output_file= path_system_output),
                                        file_format = file_format,
                                        system_output_object = formatted_system_output)
    tc_explainaboard.run()







