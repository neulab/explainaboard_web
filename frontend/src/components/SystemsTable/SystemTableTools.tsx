import React from "react";
import { Button, Input, Select, Space, Tooltip } from "antd";
import { TaskSelect } from "..";
import { TaskCategory } from "../../clients/openapi";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { SystemModel } from "../../models";

export interface Filter {
  name?: string;
  task?: string;
  sortField: string;
  sortDir: "asc" | "desc";
  split: string;
}

interface Props {
  systems: SystemModel[];
  /** show/hide submit drawer */
  toggleSubmitDrawer: () => void;
  taskCategories: TaskCategory[];
  value: Filter;
  onChange: (value: Partial<Filter>) => void;
  metricOptions: string[];
  selectedSystemIDs: string[];
  setActiveSystemIDs: React.Dispatch<React.SetStateAction<string[]>>;
}
export function SystemTableTools({
  systems,
  toggleSubmitDrawer,
  taskCategories,
  value,
  onChange,
  metricOptions,
  selectedSystemIDs,
  setActiveSystemIDs,
}: Props) {
  function findSelectedSystemDatasetNames() {
    const selectedSystems = systems.filter((sys) =>
      selectedSystemIDs.includes(sys.system_id)
    );
    return new Set<string>(
      selectedSystems.map((sys) => sys.dataset?.dataset_name || "unspecified")
    );
  }
  const selectedSystemDatasetNames = findSelectedSystemDatasetNames();

  let analysisButton = (
    <Tooltip
      title={
        <div>
          <p>Single Analysis: Click the Analysis button on any system row.</p>
          <p>
            Pairwise Analysis: Select two systems that use the same dataset. A
            Pairwise Analysis button will appear at the top. The dataset name
            can be unspecified, but proceed with caution.
          </p>
        </div>
      }
      placement="bottom"
      color="white"
      overlayInnerStyle={{ color: "black" }}
    >
      <Button type="link" size="small" style={{ padding: 0 }}>
        What kind of analysis is supported?
      </Button>
    </Tooltip>
  );

  // Single analysis
  if (selectedSystemIDs.length === 1) {
    analysisButton = (
      <Button onClick={() => setActiveSystemIDs(selectedSystemIDs)}>
        Analysis
      </Button>
    );
    // Pairwise analysis
  } else if (selectedSystemIDs.length === 2) {
    let disabled = false;
    let warning = false;
    let tooltipMessage = "";
    if (selectedSystemDatasetNames.has("unspecified")) {
      warning = true;
      tooltipMessage =
        "Unspecified dataset name detected. Proceed if you are certain the systems use the same dataset.";
    } else if (selectedSystemDatasetNames.size > 1) {
      disabled = true;
      tooltipMessage =
        "Cannot perform pairwise analysis on systems with different dataset names.";
    }
    analysisButton = (
      <Button
        disabled={disabled}
        onClick={() => setActiveSystemIDs(selectedSystemIDs)}
      >
        Pairwise Analysis
        {warning && <WarningOutlined />}
      </Button>
    );
    if (tooltipMessage !== "") {
      analysisButton = (
        <Tooltip title={tooltipMessage}>{analysisButton}</Tooltip>
      );
    }
  }

  return (
    <div style={{ width: "100%" }}>
      <Space style={{ width: "fit-content", float: "left" }}>
        {analysisButton}
      </Space>
      <Space style={{ width: "fit-content", float: "right" }}>
        <Select
          options={["test", "validation", "train", "all"].map((opt) => ({
            value: opt,
            label: opt,
          }))}
          placeholder="Dataset split"
          onChange={(value) => onChange({ split: value })}
          style={{ minWidth: "120px" }}
        />
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
