import { FileTypeToTaskExample } from "./CustomDatasetFileFormats";

export const systemOutputExamplesMap: { [key: string]: FileTypeToTaskExample } =
  {};
systemOutputExamplesMap["machine-translation"] = {
  text: {
    example: `predicted_output_text
...`,
    description: `a predicted output per line`,
  },
  json: {
    example: `[
    {"hypothesis": "这是一部好电影"},
    ...
]`,
    description: `a list of dictionaries with one key: "hypothesis"`,
  },
};

systemOutputExamplesMap["summarization"] = {
  text: {
    example: `predicted_output_text
  ...`,
    description: `a predicted output per line`,
  },
  json: {
    example: `[
      {"hypothesis": "这是一部好电影"},
      ...
  ]`,
    description: `a list of dictionaries with one key: "hypothesis"`,
  },
};

systemOutputExamplesMap["conditional-generation"] = {
  text: {
    example: `predicted_output_text
  ...`,
    description: `a predicted output per line`,
  },
  json: {
    example: `[
      {"hypothesis": "这是一部好电影"},
      ...
  ]`,
    description: `a list of dictionaries with one key: "hypothesis"`,
  },
};

systemOutputExamplesMap["text-classification"] = {
  text: {
    example: `predicted_label`,
    description: `one predicted label per line`,
  },
  json: {
    example: `[
    {"predicted_label": "positive"},
    {"predicted_label": "negative"},
    ...
]`,
    description: `a list of dictionaries with one key: "predicted_label"`,
  },
};

systemOutputExamplesMap["named-entity-recognition"] = {
  conll: {
    example: `Barack	B-PER
Obama	I-PER

I	O
love	O
America	B-LOC`,
    description:
      `"word" and "predicted_label" separated by tab. There ` +
      `should be an empty line between each sentence.`,
  },
};

systemOutputExamplesMap["chunking"] = {
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
    description:
      `"word" and "predicted_label" separated by tab. There ` +
      `should be an empty line between each sentence.`,
  },
};

systemOutputExamplesMap["qa-extractive"] = {
  json: {
    example: `[
    {
        "predicted_answers": {
            "text": "136"
        }
    },
    ...
]`,
    description: `"predicted_answers": denotes the predicted answers`,
  },
};

systemOutputExamplesMap["qa-multiple-choice"] = {
  json: {
    example: `[
    {
        "context": "The girl was as down-to-earth as a Michelin-starred canape",
        "question": "",
        "answers": {
            "text": "The girl was not down-to-earth at all.",
            "option_index": 0
        },
        "options": [
            "The girl was not down-to-earth at all.",
            "The girl was very down-to-earth."
        ],
        "predicted_answers": {
            "text": "The girl was not down-to-earth at all.",
            "option_index": 0
        }
    },
    ...
]`,
    description:
      `a list of dictionaries with five keys: "context" , "options", ` +
      `"question", "answers" (value should have two keys: "text", ` +
      `"option_index"), and "predicted_answers" (value should have ` +
      `two keys: "text", "option_index")`,
  },
};

systemOutputExamplesMap["qa-open-domain"] = {
  text: {
    example: `william henry bragg
may 18, 2018
...`,
    description: `Each line represents one predicted answer.`,
  },
};

systemOutputExamplesMap["aspect-based-sentiment-classification"] = {
  tsv: {
    example: `use	It's fast, light, and simple to use.	positive
Windows 8	Lastly, Windows 8 is annoying.	negative`,
    description: `"aspect", "sentence", and "polarity" separated by tab`,
  },
};

systemOutputExamplesMap["aspect-based-sentiment-classification"] = {
  text: {
    example: `positive
negative
...`,
    description: `predicted label on each line`,
  },
};

systemOutputExamplesMap["text-pair-classification"] = {
  text: {
    example: `predicted_label
...`,
    description: `Each line contains one predicted label.`,
  },
  json: {
    example: `[
    {"predicted_label": "contradiction"},
    {"predicted_label":"neutral"},
    ...
]`,
    description: `a list of dictionaries with one key: "predicted_label"`,
  },
};

systemOutputExamplesMap["kg-link-tail-prediction"] = {
  json: {
    example:
      `[
    {
        "gold_head": "/m/08966",
        "gold_predicate": "/travel/travel_destination/climate./` +
      `travel/travel_destination_monthly_climate/month",
        "gold_tail": "/m/05lf_",
        "predict": "tail",
        "predictions": [
            "/m/05lf_",
            "/m/02x_y",
            "/m/01nv4h",
            "/m/02l6h",
            "/m/0kz1h"
        ],
        "true_rank": 1
    },
    ...
]`,
    description:
      `a list of dictionaries with five keys: ` +
      `"gold_head", "gold_predicate", "gold_tail", "predict", ` +
      `and "predictions"`,
  },
};
