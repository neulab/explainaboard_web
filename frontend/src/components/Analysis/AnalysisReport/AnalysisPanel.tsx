import React, { ReactNode } from "react";
import { Collapse, CollapsePanelProps, Tooltip, Typography } from "antd";
interface Props extends Partial<CollapsePanelProps> {
  title: string;
  titleTooltip?: string;
  children: ReactNode;
  disabled?: boolean;
}
/** A panel of the AnalysisReport. This component implements the elements that
 * are shared among all the panel.
 * - Each Collapse only has one Panel because it's easier to control it's behavior
 * thi way.
 *  */
export function AnalysisPanel({
  title,
  titleTooltip,
  children,
  disabled,
  ...props
}: Props) {
  const header = (
    <Tooltip title={titleTooltip}>
      <Typography.Title level={4} style={{ marginBottom: 0 }}>
        <span style={{ color: disabled ? "gray" : "black" }}>{title}</span>
      </Typography.Title>
    </Tooltip>
  );
  return (
    <Tooltip title={titleTooltip}>
      <Collapse defaultActiveKey={disabled ? [] : [title]}>
        <Collapse.Panel
          header={header}
          key={title}
          showArrow={false}
          collapsible={disabled ? "disabled" : "header"}
          {...props}
        >
          {children}
        </Collapse.Panel>
      </Collapse>
    </Tooltip>
  );
}
