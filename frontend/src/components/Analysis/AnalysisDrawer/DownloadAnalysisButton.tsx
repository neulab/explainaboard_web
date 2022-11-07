import React from "react";
import { Button, ButtonProps, Tooltip } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

export function DownloadAnalysisButton(props: ButtonProps) {
  return (
    <Tooltip
      title={<div>Download all the charts.</div>}
      placement="bottom"
      color="white"
      overlayInnerStyle={{ color: "black" }}
    >
      <Button icon={<DownloadOutlined />} type="primary" {...props}>
        Download Analysis
      </Button>
    </Tooltip>
  );
}
