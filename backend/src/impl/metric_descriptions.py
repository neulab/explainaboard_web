from __future__ import annotations

_metric_to_descriptions = {
    "rouge1": "ROUGE-1 refers to the overlap of unigram (each word) between the"
    " system and reference summaries.",
    "rouge2": "ROUGE-2 refers to the overlap of bigrams between the system and"
    " reference summaries.",
    "rougeL": "ROUGE-L refers to the longest common subsequence between the "
    "system and reference summaries.",
    "prism_qe": "PRISM for quality estimation. It calculates Score(hypothesis| "
    "source)",
    "prism": "PRISM is a sequence to sequence framework trained from scratch. "
    "prism calculates the average generation score of Score(hypothesis|"
    "reference) and Score(reference|hypothesis).",
    "mover_score": "MoverScore is a metric similar to BERTScore. Different from "
    "BERTScore, it uses the Earth Mover’s Distance instead of the Euclidean Distance.",
    "comet_qe": "COMET for quality estimation. comet_qe uses the "
    "wmt20-comet-qe-da checkpoint which utilizes only source and hypothesis.",
    "comet": "COMET is a neural framework for training multilingual machine "
    "translation evaluation models. comet uses the wmt20-comet-da checkpoint"
    " which utilizes source, hypothesis and reference.",
    "chrf": "CHRF measures the character-level ngram matches between hypothesis "
    "and reference.",
    "bleu": "BLEU measures modified ngram matches between each candidate "
    "translation and the reference translations.",
    "bert_score_f": "BERTScore f score.",
    "bert_score_r": "BERTScore recall.",
    "bert_score_p": "BERTScore is a metric designed for evaluating translated "
    "text using BERT-based matching framework. bert_score_p calculates the "
    "BERTScore precision.",
    "bart_score_en_src": "BARTScore using the CNNDM finetuned BART. It "
    "calculates Score(hypothesis|source).",
    "bart_score_en_ref": "BARTScore is a sequence to sequence framework based "
    "on pre-trained language model BART.",
    "bart_score_cnn_hypo_ref": "BARTScore using the CNNDM finetuned BART. It "
    "calculates the average generation score of Score(hypothesis|reference) "
    "and Score(reference|hypothesis).",
    "bart_score_summ": "BARTScore is a sequence to sequence framework based on "
    "pre-trained language model BART. For this metric, BART is finetuned on the "
    "summarization data: CNN-Dailymail. It calculates the average generation "
    "score of Score(hypothesis|reference) and Score(reference|hypothesis).",
    "bart_score_mt": "BARTScore is a sequence to sequence framework based on "
    "pre-trained language model BART. For this metric, BART is finetuned on the "
    "paraphrase data: ParaBank. It calculates the average generation score of "
    "Score(hypothesis|reference) and Score(reference|hypothesis).",
    "length": "The length of generated text.",
    "length_ratio": "The ratio between the length of generated text and gold reference",
    "Accuracy": "Percentage of all correctly classified samples",
    "F1": "Harmonic mean of precision and recall",
    "CorrectCount": "The number of correctly predicted (e.g., classified) samples",
    "Hits1": "It is the count of how many positive samples are ranked in the "
    "top-1 positions against a bunch of negatives.",
    "Hits2": "It is the count of how many positive samples are ranked in the "
    "top-2 positions against a bunch of negatives.",
    "Hits3": "It is the count of how many positive samples are ranked in the "
    "top-3 positions against a bunch of negatives.",
    "Hits4": "It is the count of how many positive samples are ranked in the "
    "top-4 positions against a bunch of negatives.",
    "Hits5": "It is the count of how many positive samples are ranked in the "
    "top-5 positions against a bunch of negatives.",
    "Hits10": "It is the count of how many positive samples are ranked in the "
    "top-10 positions against a bunch of negatives.",
    "MRR": "Mean Reciprocal Rank is a measure to evaluate systems that return "
    "a ranked list of answers to queries.",
    "MR": "The mean rank of the true output in a predicted n-best list",
    "Perplexity": "Perplexity is a measurement of how well a probability "
    "distribution or probability model predicts a sample.",
    "LogProb": "A logarithm of a probability.",
    "ExactMatch": "The Exact Match metric measures the percentage of "
    "predictions that match any one of the ground truth answers exactly",
    "LikertScore_fluency": "Human evaluation metric for the fluency of texts "
    "with likert style",
    "LikertScore_coherence": "Human evaluation metric for the coherence of "
    "texts with likert style",
    "LikertScore_factuality": "Human evaluation metric for the factuality of "
    "texts with likert style",
    "SeqCorrectCount": "The number of correctly predicted spans in a sequence.",
    "RMSE": "Root mean square error (RMSE) measures the the difference between "
    "values predicted by the model and the values observed.",
    "Absolute Error": "Absolute error is the absolute discrepancy between the "
    "prediction and true value.",
}


def get_metric_descriptions() -> dict[str, str]:
    """getter for metric description dictionary"""
    return _metric_to_descriptions
