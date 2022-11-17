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
import { TaskCategory } from "../../clients/openapi";
import { WarningOutlined } from "@ant-design/icons";
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
  function findSelectedSystemDatasetNames() {
    const selectedSystems = systems.filter((sys) =>
      selectedSystemIDs.includes(sys.system_id)
    );
    return new Set<string>(
      selectedSystems.map((sys) => sys.dataset?.dataset_name || "unspecified")
    );
  }
  const selectedSystemDatasetNames = findSelectedSystemDatasetNames();

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
    // Pairwise or multiple system analysis
  } else {
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
    analysisButton = (
      <Button
        disabled={disabled}
        onClick={() => onActiveSystemChange(selectedSystemIDs)}
      >
        {selectedSystemIDs.length === 2
          ? "Pairwise Analysis"
          : "Multiple System Analysis"}
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

  const handleSearch = (query: string) => {
    let systemQuery = undefined;
    let datasetQuery = undefined;
    const segments = query.split(";");
    segments.forEach((seg) => {
      const components = seg.split(":");
      const property = components[0].trim();
      if (property === "system" && components.length > 1) {
        systemQuery =
          components[1]?.trim().length > 0 ? components[1].trim() : undefined;
      } else if (property === "dataset" && components.length > 0) {
        datasetQuery =
          components[1]?.trim().length > 0 ? components[1].trim() : undefined;
      }
    });
    onChange({ name: systemQuery, dataset: datasetQuery });
  };

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
        <Tooltip title="Search by system name and/or dataset name. Query format is 'system: target name; dataset: target name'.">
          <Input.Search
            placeholder="Search by system/dataset name"
            onChange={(e) => handleSearch(e.target.value)}
            style={{ minWidth: "300px" }}
          />
        </Tooltip>

        <Select
          mode="tags"
          allowClear
          placeholder="Tags"
          onChange={(value) => onChange({ systemTags: value })}
          style={{ minWidth: "120px" }}
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
