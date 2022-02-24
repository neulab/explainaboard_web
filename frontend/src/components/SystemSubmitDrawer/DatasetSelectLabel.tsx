import React from "react";
import { Typography } from "antd";
import { generateDataLabURL } from "../../utils";
interface Props {
  dataset_id: string;
  dataset_name: string;
}
export function DatasetSelectLabel({ dataset_id, dataset_name }: Props) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      {dataset_name}
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
