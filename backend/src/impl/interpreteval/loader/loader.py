import sys
import typing
from typing import Any, ClassVar, Dict, List, Optional, Union
import typing as t
import json

# loader is a global variable, storing all basic loading functions
loader_registry = {}
JSON = t.Union[str, int, float, bool, None, t.Mapping[str, 'JSON'], t.List['JSON']]

def register_loader(task_type, file_format):
    """
    a register for different data loaders, for example
    For example, @register_loader('text_classification', 'tsv')
    """
    def register_loader_fn(cls):
        if loader_registry.get(task_type) is None:
            loader_registry[task_type] = {}

        if file_format in loader_registry[task_type]:
            raise ValueError('Cannot register duplicate loader ({})'.format(file_format))
        loader_registry[task_type][file_format] = cls
        return cls

    return register_loader_fn



@register_loader('text_classification', 'jsonl')
class LoadTextClassificationJsonl:
    """
    Validate and Reformat system output file with jsonl format:
    {
        "text": "I love this movie",
        "true_label": "positive",
        "predict_label":"negative"
    } \n

    usage:
        builder = loader_registry['text_classification']['jsonl']()
        system_output_dict = builder.load(path_system_output = "your_path").system_output
        system_output_json = builder.load(path_system_output = "your_path").to_json().system_output
    """

    def __init__(self, path_system_output:str = None):
        self._path_system_output:str = path_system_output
        self._system_output:List[dict] = []

    def load(self, path_system_output:str = None):
        """
        :param path_system_output: the path of system output file with jsonl format
        :return: class object
        """
        self._path_system_output: str = path_system_output
        self._system_output = []
        with open(self._path_system_output, encoding="utf8") as fin:
            for id_, line in enumerate(fin):
                jsonl_info = json.loads(line)
                text, true_label, predicted_label = jsonl_info["text"], jsonl_info["true_label"], jsonl_info["predicted_label"]
                self._system_output.append({"id":id_,
                                            "text": text.strip(),
                                            "true_label": true_label.strip(),
                                            "predicted_label": predicted_label.strip()})
        return self


    def to_json(self):
        """
        :return: class object
        """
        self._system_output: JSON = json.dumps(self._system_output, indent=4)
        return self

    @property
    def system_output(self):
        return self._system_output



# path_system_output = "../data/test-classification.jsonl"
# builder = loader_registry['text_classification']['jsonl']()
# system_output_dict = builder.load(path_system_output = path_system_output).system_output
# print(system_output_dict)
# system_output_json = builder.load(path_system_output = path_system_output).to_json().system_output
# print(system_output_json)


@register_loader('text_classification', 'tsv')
class LoadTextClassificationTsv:
    """
    Validate and Reformat system output file with tsv format:
    text \t true_label \t predicted_label

    usage:
        builder = loader_registry['text_classification']['tsv']()
        system_output_dict = builder.load(path_system_output = "your_path").system_output
        system_output_json = builder.load(path_system_output = "your_path").to_json().system_output

    Output (one sample):
    {
        "id": 0,
        "text": "so few movies explore religion that it 's disappointing to see one reduce it to an idea that fits in a sampler .",
        "true_label": "0",
        "predicted_label": "0"
    }

    """

    def __init__(self, path_system_output:str = None):
        self._path_system_output:str = path_system_output
        self._system_output:List[dict] = []

    def load(self, path_system_output:str = None):
        """
        :param path_system_output: the path of system output file with following format:
        text \t label \t predicted_label
        :return: class object
        """
        self._path_system_output: str = path_system_output
        self._system_output = []
        try:
            with open(self._path_system_output, encoding="utf8") as fin:
                for id_, line in enumerate(fin):
                    text, true_label, predicted_label= line.split("\t")
                    self._system_output.append({"id":id_,
                                                "text": text.strip(),
                                                "true_label": true_label.strip(),
                                                "predicted_label": predicted_label.strip()})
        except FileNotFoundError:
            print("File not found. Check the path variable and filename")
        return self


    def to_json(self):
        """
        :return: class object
        """
        self._system_output: JSON = json.dumps(self._system_output, indent=4)
        return self

    @property
    def system_output(self):
        return self._system_output


"""
Test Demo
"""
# path_system_output = "../data/test-classification.tsv"
# builder = loader_registry['text_classification']['tsv']()
# system_output_dict = builder.load(path_system_output = path_system_output).system_output
# print(system_output_dict)
#
# system_output_json = builder.load(path_system_output = path_system_output).to_json().system_output
# print(system_output_json)


