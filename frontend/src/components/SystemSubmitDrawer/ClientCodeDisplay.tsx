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
  use_custom_dataset: boolean;
  custom_dataset_file_type: string;
  split: string;
  metric_names: string[];
  source_language: string;
  target_language: string;
  shared_users: string[];
  public: boolean;
};

function getPythonClientCode(fields: CodeGenFields) {
  const params: { [key: string]: string } = {
    task: `"${fields.task}"`,
    system_name: `"${fields.system_names[0] || ""}"`,
    system_output_file: '"PATH TO YOUR SYSTEM"',
    system_output_file_type: `"${fields.system_output_file_type}"`,
    source_language: `"${fields.source_language}"`,
  };

  if (fields.use_custom_dataset) {
    params["custom_dataset_file"] = `"PATH TO YOUR DATASET FILE"`;
    params["custom_dataset_file_type"] = `"${fields.custom_dataset_file_type}"`;
    params["split"] = `"${fields.split}"`;
  } else {
    params["dataset"] = `"${fields.dataset}"`;
  }

  if (fields.metric_names.length > 0)
    params["metric_names"] = `[${fields.metric_names.map(
      (name) => `"${name}",`
    )}]`;
  if (fields.target_language)
    params["target_language"] = fields.target_language;
  if (fields.shared_users.length > 0)
    params["shared_users"] = `[${fields.shared_users.map(
      (user) => `"${user}",`
    )}]`;
  if (fields.public) params["public"] = "True";

  const paramLines = Object.keys(params)
    .map((key) => `    ${key}=${params[key]}`)
    .join(",\n");

  return `
import os
import explainaboard_client

# Set up your environment
explainaboard_client.username = os.environ['EB_USERNAME']
explainaboard_client.api_key = os.environ['EB_API_KEY']
client = explainaboard_client.ExplainaboardClient()

# Do the evaluation
evaluation_result = client.evaluate_system_file(\n${paramLines}\n)
`;
}

function getBashClientCode(fields: CodeGenFields) {
  const params: { [key: string]: string } = {
    task: `"${fields.task}"`,
    "system-name": `"${fields.system_names[0] || ""}"`,
    "system-output-file": '"PATH TO YOUR SYSTEM"',
    "system-output-file-type": `"${fields.system_output_file_type}"`,
    "source-language": `"${fields.source_language}"`,
  };

  if (fields.use_custom_dataset) {
    params["custom-dataset-file"] = `"PATH TO YOUR DATASET FILE"`;
    params["custom-dataset-file-type"] = `"${fields.custom_dataset_file_type}"`;
    params["split"] = `"${fields.split}"`;
  } else {
    params["dataset"] = `"${fields.dataset}"`;
  }

  if (fields.metric_names.length > 0)
    params["metric-names"] = `${fields.metric_names.map(
      (name) => `"${name}" `
    )}`;
  if (fields.target_language)
    params["target-language"] = fields.target_language;
  if (fields.shared_users.length > 0)
    params["shared-users"] = `${fields.shared_users.map(
      (user) => `"${user}" `
    )}`;
  if (fields.public) params["public"] = "";

  const paramLines = Object.keys(params)
    .map((key) => `--${key} ${params[key]}`)
    .join(" \\ \n");

  return `
# pip install explainaboard_client

python -m explainaboard_client.cli.evaluate_system \\\n${paramLines}
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
