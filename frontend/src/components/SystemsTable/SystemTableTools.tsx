import React from "react";
import { Button, Input, Select, Space, Tooltip } from "antd";
import { TaskSelect } from "..";
import { TaskCategory } from "../../clients/openapi";
import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";

export interface Filter {
  name?: string;
  task?: string;
  sortField: string;
  sortDir: "asc" | "desc";
}

interface Props {
  /** show/hide submit drawer */
  toggleSubmitDrawer: () => void;
  taskCategories: TaskCategory[];
  value: Filter;
  onChange: (value: Partial<Filter>) => void;
  metricOptions: string[];
}
export function SystemTableTools({
  toggleSubmitDrawer,
  taskCategories,
  value,
  onChange,
  metricOptions,
}: Props) {
  return (
    <div style={{ width: "100%" }}>
      <Space style={{ width: "fit-content", float: "right" }}>
        <TaskSelect
          taskCategories={taskCategories}
          allowClear
          value={value.task}
          onChange={(value) => onChange({ task: value || "" })}
          placeholder="All Tasks"
          style={{ minWidth: "150px" }}
        />
        <div>
          <Select
            options={[
              ...metricOptions.map((opt) => ({ value: opt, label: opt })),
              { value: "created_at", label: "Created At" },
            ]}
            value={value.sortField}
            onChange={(value) => onChange({ sortField: value })}
            style={{ minWidth: "120px" }}
          />
          <Tooltip title="Click to change sort direction">
            <Button
              icon={
                value.sortDir === "asc" ? (
                  <ArrowUpOutlined />
                ) : (
                  <ArrowDownOutlined />
                )
              }
              onClick={() =>
                onChange({ sortDir: value.sortDir === "asc" ? "desc" : "asc" })
              }
            />
          </Tooltip>
        </div>

        <Input.Search
          placeholder="Search by system name"
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />

        <Button type="primary" onClick={() => toggleSubmitDrawer()}>
          New
        </Button>
      </Space>
    </div>
  );
}
