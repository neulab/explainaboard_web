import React from "react";
import { LockOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";

export function PrivateIcon() {
  return (
    <Tooltip title="Private">
      <LockOutlined />
    </Tooltip>
  );
}
