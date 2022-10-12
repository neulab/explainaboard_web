import React, { useCallback, useEffect } from "react";
import { UploadChangeParam, UploadFile } from "antd/lib/upload/interface";
import { Space, Button, CheckboxOptionType, Radio, Upload, Input } from "antd";
import { UploadOutlined } from "@ant-design/icons";

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
  allowedFileTypes: string[];
}
/** DataFileUpload that works with Form.Item */
export function DataFileUpload({
  value,
  onChange,
  allowedFileTypes,
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

  return (
    <div>
      <Upload
        maxCount={maxFileCount}
        beforeUpload={(file) => {
          return false;
        }}
        fileList={fileList}
        onChange={onFileChange}
        itemRender={(originNode, file) =>
          maxFileCount > 1 ? (
            <Space>
              <Input
                addonBefore="System Name"
                onChange={(e) => onSysNameChange(file.uid, e.target.value)}
              ></Input>
              {originNode}
            </Space>
          ) : (
            originNode
          )
        }
      >
        <Button icon={<UploadOutlined />}>Select File</Button>
      </Upload>
      <Radio.Group
        size="small"
        options={FILE_TYPES.map((type) => ({
          ...type,
          disabled: !allowedFileTypes.includes(type.value as string),
        }))}
        value={fileType}
        onChange={(e) => onFileTypeChange(e.target.value)}
      />
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
