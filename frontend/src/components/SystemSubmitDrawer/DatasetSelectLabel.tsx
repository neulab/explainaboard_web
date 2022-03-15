import React from "react";
import { Divider, Typography } from "antd";
import { generateDataLabURL } from "../../utils";
import { DatasetMetadata } from "../../clients/openapi";
interface Props {
  dataset: DatasetMetadata;
}
export function DatasetSelectLabel({ dataset }: Props) {
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
        href={generateDataLabURL(dataset_id)}
        target="_blank"
        onClick={(e) => e.stopPropagation()}
      >
        DataLab
      </Typography.Link>
    </div>
  );
}
