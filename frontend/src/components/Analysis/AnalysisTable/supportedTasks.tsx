export const condgenTasks = [
  "machine-translation",
  "summarization",
  "conditional_generation",
];

export const multiSystemExampleTableSupportedTasks = [
  "machine-translation",
  "summarization",
  "conditional_generation",
  "text-classification",
  "text-pair-classification",
];

/**  Defined Column Info for partial tasks (machine-translation,
 * summarization, conditional_generation, text-classification,
 * text-pair-classification) */
export const colInfoForTasks = new Map();
for (const t of condgenTasks) {
  colInfoForTasks.set(t, [
    { id: "source", name: "Source", maxWidth: "500px" },
    { id: "reference", name: "Reference", maxWidth: "500px" },
  ]);
}
colInfoForTasks.set("text-classification", [
  { id: "text", name: "Text", maxWidth: "400px" },
  { id: "true_label", name: "True Label" },
]);
colInfoForTasks.set("text-pair-classification", [
  { id: "text1", name: "Text 1", maxWidth: "400px" },
  { id: "text2", name: "Text 2", maxWidth: "400px" },
  { id: "true_label", name: "True Label" },
]);

/** Prediction Column for partial tasks (machine-translation,
 * summarization, conditional_generation, text-classification,
 * text-pair-classification)*/
export const predictionColForTasks = new Map();
for (const t of condgenTasks) {
  predictionColForTasks.set(t, [
    { id: "hypothesis", name: "Hypothesis", maxWidth: "500px" },
  ]);
}
predictionColForTasks.set("text-classification", [
  { id: "predicted_label", name: "Predicted Label" },
]);
predictionColForTasks.set("text-pair-classification", [
  { id: "predicted_label", name: "Predicted Label" },
]);
