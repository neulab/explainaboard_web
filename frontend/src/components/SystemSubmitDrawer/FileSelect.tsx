import React, { useCallback, useEffect } from "react";
import { UploadChangeParam, UploadFile } from "antd/lib/upload/interface";
import {
  Space,
  Button,
  CheckboxOptionType,
  Radio,
  Upload,
  Input,
  Popover,
} from "antd";
import { PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { CodeBlock, dracula } from "react-code-blocks";
import { customDatasetExamplesMap } from "./CustomDatasetFileFormats";
import { systemOutputExamplesMap } from "./SystemOutputFileFormats";
export interface DataFileValue {
  fileList?: UploadFile[];
  // A map from uploaded file uid to the system name
  sysNames?: { [key: string]: string };
  fileType?: string;
}
interface Props {
  value?: DataFileValue;
  onChange?: (value: DataFileValue) => void;
  maxFileCount?: number;
  taskName: string;
  forCustomDataset?: boolean;
  allowedFileTypes: string[];
}

/** Returns required format for system outputs based on selected task and file
type. Returns custom dataset format if `forCustomDataset` is set to true. */
function getFileFormat(
  selectedTask: string,
  fileType: string,
  forCustomDataset = false
) {
  const header = fileType + " file format";
  const codeBlocklanguage = fileType === "json" ? "json" : "text";
  const taskExamples = forCustomDataset
    ? customDatasetExamplesMap[selectedTask]
    : systemOutputExamplesMap[selectedTask];
  if (taskExamples === undefined) return; // task not found in xxxFileFormats.tsx

  const example = taskExamples[fileType];
  if (example === undefined) return; // fileType not found for task in xxxFileFormats.tsx

  const exampleText = taskExamples[fileType].example;
  if (exampleText === undefined) return;

  const descriptionText = taskExamples[fileType].description;
  return (
    <>
      {header}: {descriptionText}
      <br />
      <b>Example:</b>
      <CodeBlock
        language={codeBlocklanguage}
        text={exampleText}
        theme={dracula}
      />
    </>
  );
}

/** DataFileUpload that works with Form.Item */
export function DataFileUpload({
  value,
  onChange,
  allowedFileTypes,
  taskName,
  forCustomDataset = false,
  maxFileCount = 1,
}: Props) {
  const fileList = value?.fileList;
  const sysNames = value?.sysNames;
  const fileType = value?.fileType;

  const triggerChange = useCallback(
    (changedValue: Partial<DataFileValue>) => {
      const newValue = {
        fileList,
        sysNames,
        fileType,
        ...changedValue,
      };
      if (onChange) onChange(newValue);
    },
    [fileList, fileType, sysNames, onChange]
  );

  useEffect(() => {
    if (fileType && !allowedFileTypes.includes(fileType)) {
      triggerChange({ fileType: undefined });
    }
  }, [allowedFileTypes, fileType, triggerChange]);

  /**
   * 1. take an event and updates the filelist
   * 2. determines file type according to file extension. user can also override the file type selection
   * */
  function onFileChange(e: UploadChangeParam<UploadFile<unknown>>) {
    const fileList = e && e.fileList;
    if (!fileList || fileList.length === 0) {
      triggerChange({ fileList: undefined });
      return;
    }
    let fileExtension = fileList[0].name.split(".")[1].toLowerCase();
    if (fileExtension === "jsonl") fileExtension = "json"; // SDK treats them the same
    if (fileExtension === "txt") fileExtension = "text";
    const newFileType = FILE_TYPES.find((type) => type.value === fileExtension);
    const newValue = { fileList, fileType };
    if (newFileType && allowedFileTypes.includes(newFileType.value as string)) {
      newValue.fileType = newFileType.value as string;
    }
    triggerChange(newValue);
  }

  function onFileTypeChange(newFileType: string) {
    triggerChange({ fileType: newFileType });
  }

  function onSysNameChange(fileName: string, sysName: string) {
    const newSysNames = { ...sysNames, [fileName]: sysName };
    triggerChange({ sysNames: newSysNames });
  }

  const singleFile = maxFileCount <= 1;

  const uploadBtn = singleFile ? (
    <Button icon={<UploadOutlined />}>Select File</Button>
  ) : (
    <Button icon={<PlusOutlined />} block className="add-submission">
      {fileList && fileList.length > 1 ? "Add Another File" : "Add File"}
    </Button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Radio.Group
        size="small"
        options={FILE_TYPES.map((type) => ({
          ...type,
          label: !allowedFileTypes.includes(type.value as string) ? (
            <>{type.label}</>
          ) : (
            <Popover
              content={getFileFormat(
                taskName,
                type.value as string,
                forCustomDataset
              )}
              overlayStyle={{
                maxWidth: "600px",
              }}
            >
              {type.label}
            </Popover>
          ),
          disabled: !allowedFileTypes.includes(type.value as string),
        }))}
        value={fileType}
        onChange={(e) => onFileTypeChange(e.target.value)}
      />
      <Upload
        maxCount={maxFileCount}
        beforeUpload={(file) => {
          return false;
        }}
        fileList={fileList}
        onChange={onFileChange}
        className={singleFile ? "" : "file-submissions"}
        itemRender={(originNode, file) =>
          singleFile ? (
            originNode
          ) : (
            <Space>
              <Input
                addonBefore="System Name"
                onChange={(e) => onSysNameChange(file.uid, e.target.value)}
              ></Input>
              {originNode}
            </Space>
          )
        }
      >
        {uploadBtn}
      </Upload>
    </div>
  );
}
const FILE_TYPES: CheckboxOptionType[] = [
  { value: "csv", label: "CSV" },
  { value: "tsv", label: "TSV" },
  { value: "json", label: "JSON or JSON Line" },
  { value: "text", label: "Text" },
  { value: "conll", label: "CoNLL" },
];
