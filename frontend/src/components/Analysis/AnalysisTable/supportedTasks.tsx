export const condgenTasks = [
  "machine-translation",
  "summarization",
  "conditional_generation",
];

export const taskTable = new Map<string, Table>();

interface Table {
  datasetColumns: ColumnInfo[];
  predictionColumns: ColumnInfo[];
}

export interface ColumnInfo {
  id: string;
  name: string;
  maxWidth?: string;
}

for (const t of condgenTasks) {
  taskTable.set(t, {
    datasetColumns: [
      { id: "source", name: "Source", maxWidth: "400px" },
      { id: "reference", name: "Reference", maxWidth: "400px" },
    ],
    predictionColumns: [
      { id: "hypothesis", name: "Hypothesis", maxWidth: "400px" },
    ],
  });
}

taskTable.set("text-classification", {
  datasetColumns: [
    { id: "text", name: "Text", maxWidth: "400px" },
    { id: "true_label", name: "True Label" },
  ],
  predictionColumns: [{ id: "predicted_label", name: "Predicted Label" }],
});

taskTable.set("text-pair-classification", {
  datasetColumns: [
    { id: "text1", name: "Text 1", maxWidth: "400px" },
    { id: "text2", name: "Text 2", maxWidth: "400px" },
    { id: "true_label", name: "True Label" },
  ],
  predictionColumns: [{ id: "predicted_label", name: "Predicted Label" }],
});
