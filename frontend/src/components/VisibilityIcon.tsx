import React from "react";
import { LockOutlined, UnlockOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";

export function VisibilityIcon({ isPrivate }: { isPrivate: boolean }) {
  if (isPrivate)
    return (
      <Tooltip title="Private">
        <LockOutlined />
      </Tooltip>
    );
  return (
    <Tooltip title="Public">
      <UnlockOutlined />
    </Tooltip>
  );
}
