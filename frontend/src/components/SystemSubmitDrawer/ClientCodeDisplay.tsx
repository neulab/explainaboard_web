import { Drawer, DrawerProps, Radio, Space, Typography } from "antd";
import React, { useState } from "react";
import { CopyBlock, dracula } from "react-code-blocks";
import { FormData } from ".";

/**
 * Parse the form into fields so that client code generator can recognize
 */
function parseFormData(
  formData: Partial<FormData>,
  useCustomDataset: boolean
): CodeGenFields {
  let names: string[] = [];
  if (formData.sys_out_file?.fileList) {
    const sysNames = formData.sys_out_file?.sysNames;
    if (sysNames) {
      names = formData.sys_out_file.fileList.map((file) => sysNames[file.uid]);
    }
  }

  return {
    task: formData.task || "",
    system_name: names[0] || "",
    system_output_file_type: formData.sys_out_file?.fileType || "",
    system_output_file_path: "PATH TO YOUR SYSTEM",
    dataset: formData.dataset?.datasetID || "",
    use_custom_dataset: useCustomDataset,
    custom_dataset_file_type: formData.custom_dataset_file?.fileType || "",
    custom_dataset_file_path: "PATH TO YOUR DATASET FILE",
    split: formData.dataset?.split || "",
    metric_names: formData.metric_names || [],
    source_language: formData.source_language || "",
    target_language: formData.target_language || "",
    shared_users: formData.shared_users || [],
    system_tags: formData.system_tags || [],
    public: !formData.is_private,
  };
}

export type CodeGenFields = {
  task: string;
  system_name: string;
  system_output_file_type: string;
  system_output_file_path: string;
  dataset: string;
  use_custom_dataset: boolean;
  custom_dataset_file_type: string;
  custom_dataset_file_path: string;
  split: string;
  metric_names: string[];
  source_language: string;
  target_language: string;
  shared_users: string[];
  system_tags: string[];
  public: boolean;
};

function getPythonClientCode(fields: CodeGenFields) {
  const params: { [key: string]: string } = {
    task: `"${fields.task}"`,
    system_name: `"${fields.system_name}"`,
    system_output_file: `"${fields.system_output_file_path}"`,
    system_output_file_type: `"${fields.system_output_file_type}"`,
    source_language: `"${fields.source_language}"`,
  };

  if (fields.use_custom_dataset) {
    params["custom_dataset_file"] = `"${fields.custom_dataset_file_path}"`;
    params["custom_dataset_file_type"] = `"${fields.custom_dataset_file_type}"`;
    params["split"] = `"${fields.split}"`;
  } else {
    params["dataset"] = `"${fields.dataset}"`;
  }

  if (fields.metric_names.length > 0)
    params["metric_names"] = `[${fields.metric_names.map(
      (name) => `"${name}"`
    )}]`;
  if (fields.target_language)
    params["target_language"] = fields.target_language;
  if (fields.shared_users.length > 0)
    params["shared_users"] = `[${fields.shared_users.map(
      (user) => `"${user}"`
    )}]`;
  if (fields.system_tags.length > 0)
    params["system_tags"] = `[${fields.system_tags.map((tag) => `"${tag}"`)}]`;

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
    "system-name": `"${fields.system_name}"`,
    "system-output-file": `"${fields.system_output_file_path}"`,
    "system-output-file-type": `"${fields.system_output_file_type}"`,
    "source-language": `"${fields.source_language}"`,
  };

  if (fields.use_custom_dataset) {
    params["custom-dataset-file"] = `"${fields.custom_dataset_file_path}"`;
    params["custom-dataset-file-type"] = `"${fields.custom_dataset_file_type}"`;
    params["split"] = `"${fields.split}"`;
  } else {
    params["dataset"] = `"${fields.dataset}"`;
  }

  if (fields.metric_names.length > 0)
    params["metric-names"] = fields.metric_names
      .map((name) => `"${name}"`)
      .join(" ");
  if (fields.target_language)
    params["target-language"] = fields.target_language;
  if (fields.shared_users.length > 0)
    params["shared-users"] = fields.shared_users
      .map((user) => `"${user}"`)
      .join(" ");
  if (fields.system_tags.length > 0)
    params["system-tags"] = fields.system_tags
      .map((tag) => `"${tag}"`)
      .join(" ");
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
  formData: FormData;
  useCustomDataset: boolean;
  visible: boolean;
  onClose: () => void;
}

export default function ClientCodeDisplay({
  formData,
  useCustomDataset,
  visible = false,
  onClose,
  ...rest
}: Props) {
  const [language, setLanguage] = useState<string>(defaultLang);
  const onLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
  };

  return (
    <Drawer visible={visible} onClose={onClose} {...rest}>
      <Space direction="vertical">
        <Typography.Title level={5}>
          Submit With Command Line Client
        </Typography.Title>

        <Radio.Group
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
        >
          {supportedLangs.map((lang) => (
            <Radio.Button key={lang} value={lang}>
              {lang}
            </Radio.Button>
          ))}
        </Radio.Group>
        <CopyBlock
          language={language}
          text={getCodeFuncs[language](
            parseFormData(formData, useCustomDataset)
          )}
          theme={dracula}
        />
      </Space>
    </Drawer>
  );
}
