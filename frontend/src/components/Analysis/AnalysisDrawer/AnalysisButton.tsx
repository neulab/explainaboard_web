import React from "react";
import { Button, ButtonProps, Tooltip } from "antd";
import { RedoOutlined } from "@ant-design/icons";

export function AnalysisButton(props: ButtonProps) {
  return (
    <Tooltip
      title={
        <div>
          Adding, removing, or changing the right bounds of any graph enables
          this button. Click it to update the analysis results.
        </div>
      }
      placement="bottom"
      color="white"
      overlayInnerStyle={{ color: "black" }}
    >
      <Button icon={<RedoOutlined />} type="primary" {...props}>
        Update analysis
      </Button>
    </Tooltip>
  );
}
