import React from "react";
import { Button, ButtonProps } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

export function DownloadAnalysisButton(props: ButtonProps) {
  return (
    <Button icon={<DownloadOutlined />} type="primary" {...props}>
      Download Charts
    </Button>
  );
}
