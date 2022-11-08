import {
  Drawer,
  DrawerProps,
  Radio,
  RadioChangeEvent,
  Space,
  Typography,
} from "antd";
import React, { useState } from "react";
import { CopyBlock, dracula } from "react-code-blocks";

export const showCliCodeKey = "showCliCode";

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
          system_output_file='${"PATH TO YOUR SYSTEM"}',
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

    python -m explainaboard_client.cli.evaluate_system \\
    --task ${fields.task} \\
    --system-name ${"SYSNAME"} \\
    --system-output-file ${"PATH_TO_YOUR_SYSTEM"} \\
    --system-output-file-type ${fields.system_output_file_type} \\
    --dataset ${fields.dataset} \\
    --split ${fields.split} \\
    --source-language ${fields.source_language} \
  `;
}

const getCodeFuncs: {
  [key: string]: (fields: CodeGenFields) => string;
} = {
  python: getPythonClientCode,
  bash: getBashClientCode,
};

const defaultLang = "python";
const supportedLangs = ["python", "bash"];

interface Props extends DrawerProps {
  codeGenFields: CodeGenFields;
  visible: boolean;
  onClose: () => void;
}

export default function ClientCodeDisplay({
  codeGenFields,
  visible = false,
  onClose,
  ...rest
}: Props) {
  const [language, setLanguage] = useState<string>(defaultLang);
  const handleSizeChange = (e: RadioChangeEvent) => {
    setLanguage(e.target.value);
  };

  function closeAndSaveOption() {
    localStorage.setItem(showCliCodeKey, "false");
    onClose();
  }

  return (
    <Drawer visible={visible} onClose={closeAndSaveOption} {...rest}>
      <Space direction="vertical">
        <Typography.Title level={5}>
          Submit With Command Line Client
        </Typography.Title>

        <Radio.Group value={language} onChange={handleSizeChange}>
          {supportedLangs.map((lang) => (
            <Radio.Button key={lang} value={lang}>
              {lang}
            </Radio.Button>
          ))}
        </Radio.Group>
        <CopyBlock
          language={language}
          text={getCodeFuncs[language](codeGenFields)}
          theme={dracula}
        />
      </Space>
    </Drawer>
  );
}
