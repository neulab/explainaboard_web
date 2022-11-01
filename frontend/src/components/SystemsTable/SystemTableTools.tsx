import React from "react";
import {
  Button,
  ButtonProps,
  Input,
  Select,
  Space,
  Tooltip,
  message,
  Popconfirm,
  Radio,
} from "antd";
import { TaskSelect } from "..";
import { TaskCategory } from "../../clients/openapi";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { SystemModel } from "../../models";
import { LoginState, useUser } from "../useUser";
import { backendClient, parseBackendError } from "../../clients";
import { FilterUpdate, SystemFilter } from "./SystemFilter";

interface Props {
  systems: SystemModel[];
  /** show/hide submit drawer */
  showSubmitDrawer: () => void;
  taskCategories: TaskCategory[];
  value: SystemFilter;
  onChange: (value: FilterUpdate) => void;
  metricOptions: string[];
  selectedSystemIDs: string[];
  onActiveSystemChange: (ids: string[]) => void;
}
export function SystemTableTools({
  systems,
  showSubmitDrawer,
  taskCategories,
  value,
  onChange,
  metricOptions,
  selectedSystemIDs,
  onActiveSystemChange,
}: Props) {
  function findSelectedSystemDatasetNames(selectedSystems: SystemModel[]) {
    return new Set<string>(
      selectedSystems.map((sys) => sys.dataset?.dataset_name || "unspecified")
    );
  }
  function hasDuplicateSelectedSystemNames(selectedSystems: SystemModel[]) {
    const selectedSystemNames = selectedSystems.map((sys) => sys.system_name);
    const distinctSystemNames = new Set(selectedSystemNames);
    return distinctSystemNames.size !== selectedSystemNames.length
      ? true
      : false;
  }
  const selectedSystems = systems.filter((sys) =>
    selectedSystemIDs.includes(sys.system_id)
  );
  const selectedSystemDatasetNames =
    findSelectedSystemDatasetNames(selectedSystems);
  const duplicateSelectedSystemNames =
    hasDuplicateSelectedSystemNames(selectedSystems);

  // Deleted Selected Systems
  async function deleteSystems(systemIDs: string[]) {
    for (const systemID of systemIDs) {
      try {
        await backendClient.systemsDeleteById(systemID);
        message.success("Success");
      } catch (e) {
        if (e instanceof Response) {
          message.error((await parseBackendError(e)).getErrorMsg());
        }
      }
    }
    document.location.reload();
  }

  let deleteButton = (
    <Tooltip
      title={
        <div>
          <p>Delete selected system outputs</p>
        </div>
      }
      placement="bottom"
      color="white"
      overlayInnerStyle={{ color: "black" }}
    ></Tooltip>
  );

  if (selectedSystemIDs.length >= 1) {
    deleteButton = (
      <Popconfirm
        title="Are you sure?"
        onConfirm={() => deleteSystems(selectedSystemIDs)}
      >
        <Button>Delete</Button>
      </Popconfirm>
    );
  }

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
          <p>
            Multi-system Analysis: Select multiple system that use the same
            dataset.
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
      <Button onClick={() => onActiveSystemChange(selectedSystemIDs)}>
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
        "Cannot perform multiple system analysis on systems with different dataset names.";
    }
    if (duplicateSelectedSystemNames) {
      disabled = true;
      tooltipMessage =
        "Cannot perform multiple system analysis on systems with the same names.";
    }
    analysisButton = (
      <Button
        disabled={disabled}
        onClick={() => onActiveSystemChange(selectedSystemIDs)}
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
    // three or more systems
  } else if (selectedSystemIDs.length >= 3) {
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
        "Cannot perform multiple analysis on systems with different dataset names.";
    }
    if (duplicateSelectedSystemNames) {
      disabled = true;
      tooltipMessage =
        "Cannot perform multiple system analysis on systems with the same names.";
    }
    analysisButton = (
      <Button
        disabled={disabled}
        onClick={() => onActiveSystemChange(selectedSystemIDs)}
      >
        Multiple System Analysis
        {warning && <WarningOutlined />}
      </Button>
    );
    if (tooltipMessage !== "") {
      analysisButton = (
        <Tooltip title={tooltipMessage}>{analysisButton}</Tooltip>
      );
    }
  }

  const { state } = useUser();
  const loggedIn = state === LoginState.yes;

  /**
   * showMine radio buttion options.
   * There are two labels, `My systems` and `All systems`. If `My systems`
   * is clicked, value is set to `true` for `showMine`. Otherwise, false.
   *
   * If the user is not logged in, `My Systems` option would be disabled.
   */
  const showMineOptions = [
    { label: "My Systems", value: true, disabled: !loggedIn },
    { label: "All Systems", value: false },
  ];

  let mineVsAllSystemsToggle = (
    <Radio.Group
      options={showMineOptions}
      onChange={({ target: { value } }) => onChange({ showMine: value })}
      value={value.showMine}
      optionType="button"
      buttonStyle="solid"
    />
  );

  // add "remind log in pop up" if not logged in
  if (!loggedIn) {
    const remindLogInMessage = (
      <div>
        <p>Please log in to see your own systems.</p>
      </div>
    );

    mineVsAllSystemsToggle = (
      <Tooltip title={remindLogInMessage}>{mineVsAllSystemsToggle}</Tooltip>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <Space style={{ width: "fit-content", float: "left" }}>
        {analysisButton}
      </Space>
      <Space style={{ width: "fit-content", float: "left" }}>
        {deleteButton}
      </Space>
      <Space style={{ width: "fit-content", float: "right" }}>
        {mineVsAllSystemsToggle}
        <Select
          options={["test", "validation", "train", "all"].map((opt) => ({
            value: opt,
            label: opt,
          }))}
          value={value.split || undefined}
          placeholder="Dataset split"
          onChange={(value) => onChange({ split: value })}
          style={{ minWidth: "120px" }}
        />
        <TaskSelect
          taskCategories={taskCategories}
          allowClear
          value={value.task || undefined}
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

        <NewSystemButton onClick={showSubmitDrawer} />
      </Space>
    </div>
  );
}

function NewSystemButton(props: ButtonProps) {
  const { state } = useUser();
  if (state === LoginState.yes)
    return (
      <Button type="primary" {...props}>
        New
      </Button>
    );
  return (
    <Tooltip title="Please log in to submit new systems" placement="topLeft">
      <Button disabled>New</Button>
    </Tooltip>
  );
}
