export interface FileTypeToTaskExample {
  [key: string]: TaskExample;
}

interface TaskExample {
  [key: string]: string;
}

export const customDatasetExamplesMap: {
  [key: string]: FileTypeToTaskExample;
} = {};
customDatasetExamplesMap["machine-translation"] = {
  tsv: {
    example: `This is a good movie    这是一部好电影
...`,
    description: `"source" and "reference" separated by tab`,
  },
  json: {
    example: `[
    {"source": "This is a good movie", "reference": "这是一部好电影"},
    ...
]`,
    description: `a list of dictionaries with two keys: "source" and "reference"`,
  },
};

customDatasetExamplesMap["summarization"] = {
  tsv: {
    example: `This is a good movie    这是一部好电影
...`,
    description: `"source" and "reference" separated by tab`,
  },
  json: {
    example: `[
    {"source": "This is a good movie", "reference": "这是一部好电影"},
    ...
]`,
    description: `a list of dictionaries with two keys: "source" and "reference"`,
  },
};

customDatasetExamplesMap["conditional-generation"] = {
  tsv: {
    example: `This is a good movie    这是一部好电影
...`,
    description: `"source" and "reference" separated by tab`,
  },
  json: {
    example: `[
    {"source": "This is a good movie", "reference": "这是一部好电影"},
    ...
]`,
    description: `a list of dictionaries with two keys: "source" and "reference"`,
  },
};

customDatasetExamplesMap["text-classification"] = {
  tsv: {
    example: `I love this movie   positive
The movie is too long   negative
...`,
    description: `"text" and "true_label" separated by tab`,
  },
  json: {
    example: `[
    {"text": "I love this movie", "true_label": "positive"},
    {"text": "The movie is too long", "true_label": "negative"}
    ...
]`,
    description: `a list of dictionaries with two keys: "text" and "true_label"`,
  },
};

customDatasetExamplesMap["named-entity-recognition"] = {
  conll: {
    example: `Barack	B-PER
Obama	I-PER

I	O
love	O
America	B-LOC`,
    description: `"word" and "label" separated by tab. There should be an empty line between each sentence.`,
  },
};

customDatasetExamplesMap["chunking"] = {
  conll: {
    example: `Manville	B-NP
is	B-VP
a	B-NP
forest	I-NP
products	I-NP
concern	I-NP
.	O

Percival	B-NP
declined	B-VP
to	I-VP
comment	I-VP
.	O`,
    description: `"word" and "label" separated by tab. There should be an empty line between each sentence.`,
  },
};

customDatasetExamplesMap["qa-extractive"] = {
  json: {
    example: `[
    {"context": "Super Bowl 50 was an American footb",
    "question": "Which NFL team represented the AFC at Super Bowl 50?",
    "answers": {'text': ['Denver Broncos', 'Denver Broncos', 'Denver Broncos'], 'answer_start': [177, 177, 177]}},
    ...
]`,
    description: `a list of dictionaries with three keys: "context", "question", and "answers"`,
  },
};

customDatasetExamplesMap["qa-multiple-choice"] = {
  json: {
    example: `[
    {'context': 'The girl had the flightiness of a sparrow',
    'question': '',
    'answers': {'text': 'The girl was very fickle.', 'option_index': 0},
    'options': ['The girl was very fickle.', 'The girl was very stable.']},
    ...
]`,
    description: `a list of dictionaries with four keys: "context" , "options", "question", and "answers"`,
  },
};

customDatasetExamplesMap["qa-open-domain"] = {
  json: {
    example: `[
    {'question': 'who got the first nobel prize in physics',
    'answers': ['Wilhelm Conrad Röntgen']},
    ...
]`,
    description: `a list of dictionaries with two keys: "question" and "answers"`,
  },
};

customDatasetExamplesMap["aspect-based-sentiment-classification"] = {
  tsv: {
    example: `use	It's fast, light, and simple to use.	positive
Windows 8	Lastly, Windows 8 is annoying.	negative`,
    description: `"aspect", "sentence", and "polarity" separated by tab`,
  },
};

customDatasetExamplesMap["aspect-based-sentiment-classification"] = {
  tsv: {
    example: `use	It's fast, light, and simple to use.	positive
Windows 8	Lastly, Windows 8 is annoying.	negative`,
    description: `"aspect", "sentence", and "polarity" separated by tab`,
  },
};

customDatasetExamplesMap["text-pair-classification"] = {
  tsv: {
    example: `A man playing an electric guitar on stage.   A man playing banjo on the floor.  contradiction
A man playing an electric guitar on stage.   A man is performing for cash.  neutral
...`,
    description: `"text1", "text2", and "true_label" separated by tab`,
  },
  json: {
    example: `[
    {"text1": "A man playing an electric guitar on stage.",
    "text2": "A man playing banjo on the floor.",
    "true_label": "contradiction"},
    {"text1": "A man playing an electric guitar on stage.",
    "text2": "A man is performing for cash.",
    "true_label": "neutral"},
...
]`,
    description: `a list of dictionaries with three keys: "text1", "text2" and "true_label"`,
  },
};

customDatasetExamplesMap["kg-link-tail-prediction"] = {
  json: {
    example: `[
    {"gold_head": "abc", "gold_predicate": "dummy relation", "gold_tail":"cde"},
    ...
]`,
    description: `it's a list of dictionaries with three keys: "gold_head", "gold_predicate", and "gold_tail"`,
  },
};
