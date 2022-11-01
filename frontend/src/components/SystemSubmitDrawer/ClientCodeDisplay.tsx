import React, { useState } from "react";
import { CopyBlock, dracula } from "react-code-blocks";

export type CodeGenFields = {
  task: string;
  system_names: string[];
  system_output_file_type: string;
  dataset: string;
  split: string;
  source_language: string;
};

function getPythonClientCode(fields: CodeGenFields) {
  return `
    import os
    import explainaboard_client

    # Set up your environment
    explainaboard_client.username = os.environ['EB_USERNAME']
    explainaboard_client.api_key = os.environ['EB_API_KEY']
    client = explainaboard_client.ExplainaboardClient()

    # Do the evaluation
    for system_name in [${fields.system_names.map((name) => `"${name}"`)}]:
      evaluation_result = client.evaluate_system_file(
          task='${fields.task}',
          system_name=${"system_name"},
          system_output_file='${"PLEASE FILL IN THIS YOURSELF"}',
          system_output_file_type='${fields.system_output_file_type}',
          dataset='${fields.dataset}',
          split='${fields.split}',
          source_language='${fields.source_language}',
      )
  `;
}

function getBashClientCode(fields: CodeGenFields) {
  return `
  for SYSNAME in ${fields.system_names?.join(" ") || ""}:

    python -m explainaboard_client.cli.evaluate_system \
    --task ${fields.task} \
    --system-name ${"SYSNAME"} \
    --system-output-file ${"PLEASE FILL IN THIS YOURSELF"} \
    --system-output-file-type ${fields.system_output_file_type} \
    --dataset ${fields.dataset} \
    --split ${fields.split} \
    --source-language ${fields.source_language}
  `;
}

const getCodeFuncs: {
  [key: string]: (fields: CodeGenFields) => string;
} = {
  python: getPythonClientCode,
  bash: getBashClientCode,
};

type Props = {
  codeGenFields: CodeGenFields;
};

export default function ClientCodeDisplay({ codeGenFields }: Props) {
  const [language] = useState<string>("python");

  return (
    <div className="container mx-auto p-4">
      <div className="demo">
        <CopyBlock
          language={language}
          text={getCodeFuncs[language](codeGenFields)}
          showLineNumbers
          theme={dracula}
          wrapLines={true}
          codeBlock
        />
      </div>
    </div>
  );
}
