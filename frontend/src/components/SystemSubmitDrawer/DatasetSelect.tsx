import React from "react";
import { Divider, Select, Typography } from "antd";
import { DatasetMetadata } from "../../clients/openapi";
import { generateDataLabURL } from "../../utils";
export interface DatasetValue {
  datasetID?: string;
  split?: string;
}
interface Props {
  value?: DatasetValue;
  onChange?: (value: DatasetValue) => void;
  options: DatasetMetadata[];
  disabled: boolean;
  onSearchDataset: (text: string) => void;
}

/**Dataset select that works with Form.Item */
export function DatasetSelect({
  value,
  onChange,
  options,
  disabled,
  onSearchDataset,
}: Props) {
  const datasetID = value?.datasetID;
  const split = value?.split;

  const activeDataset = options.find((d) => d.dataset_id === datasetID);
  let splitOptions: string[] = [];
  if (activeDataset != null) {
    splitOptions = Object.keys(activeDataset.splits || {});
  }

  function triggerChange(changedValue: Partial<DatasetValue>) {
    const newValue = {
      datasetID,
      split,
      ...changedValue,
    };
    if (newValue.datasetID !== value?.datasetID) {
      newValue.split = undefined;
    }
    if (onChange) onChange(newValue);
  }

  function onDatasetChange(newDatasetID: string) {
    triggerChange({ datasetID: newDatasetID });
  }

  function onSplitChange(newSplit: string) {
    triggerChange({ split: newSplit });
  }

  return (
    <div style={{ display: "flex" }}>
      <Select
        showSearch
        allowClear
        placeholder="Please search dataset by name"
        options={options.map((dataset) => ({
          value: dataset.dataset_id,
          label: <DatasetSelectLabel dataset={dataset} />,
        }))}
        value={datasetID}
        disabled={disabled}
        filterOption={false} // disable local filter
        onChange={onDatasetChange}
        onSearch={onSearchDataset}
      />
      <Select
        options={splitOptions.map((opt) => ({ value: opt }))}
        value={split}
        disabled={disabled || !datasetID}
        placeholder="Split"
        onChange={onSplitChange}
        style={{ maxWidth: "25%" }}
      />
    </div>
  );
}

function DatasetSelectLabel({ dataset }: { dataset: DatasetMetadata }) {
  const { dataset_id, dataset_name, sub_dataset } = dataset;
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span>
        {dataset_name}
        {sub_dataset && (
          <span>
            <Divider type="vertical" />
            <span style={{ color: "gray" }}>{sub_dataset}</span>
          </span>
        )}
      </span>

      <Typography.Link
        href={generateDataLabURL(dataset_name)}
        target="_blank"
        onClick={(e) => e.stopPropagation()}
      >
        DataLab
      </Typography.Link>
    </div>
  );
}
