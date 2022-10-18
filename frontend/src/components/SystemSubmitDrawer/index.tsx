import React, { useEffect, useState, useCallback } from "react";
import {
  Button,
  Drawer,
  Select,
  DrawerProps,
  Form,
  Input,
  message,
  Space,
  Spin,
  Tooltip,
  Checkbox,
  Row,
  Col,
} from "antd";
import {
  DatasetMetadata,
  System,
  TaskCategory,
  LanguageCode,
} from "../../clients/openapi";
import { backendClient, parseBackendError } from "../../clients";
import { findTask, toBase64, unwrap } from "../../utils";
import { useForm } from "antd/lib/form/Form";
import { TaskSelect, TextWithLink } from "..";
import { DatasetSelect, DatasetValue } from "./DatasetSelect";
import { DataFileUpload, DataFileValue } from "./FileSelect";
import ReactGA from "react-ga4";
import useSearch, { FilterFunc } from "./useSearch";
import { SystemModel } from "../../models";
import "./index.css";

const { TextArea } = Input;

interface Props extends DrawerProps {
  systemToEdit?: SystemModel;
  onClose: () => void;
  visible: boolean;
}

type SysToSubmit = {
  base64: string;
  sysName: string;
};

enum State {
  loading,
  other,
}

function hasCommonString(one: string, other: string): boolean {
  return isSubstring(one, other) || isSubstring(other, one);
}
function isSubstring(query: string, string: string): boolean {
  return string.toLowerCase().includes(query.toLocaleLowerCase());
}

/**
 * Given a query, search in a given list of language codes to get
 * the matching ones. The query will try to match all fields
 * of a language code with different priority
 *
 * @param query a query string used to match all fields
 * @param data a list of language codes to search from
 * @returns a filtered list ordered (descending) by score
 */
const filterFunc: FilterFunc<LanguageCode> = (query, data) => {
  // The matching score for each language code
  // Higher value ones are better results and will be displayed earlier in a list
  const scores: { [key: string]: number } = {};

  // Maps from language name to language code object
  const languages = new Map(data.map((langCode) => [langCode.name, langCode]));

  // match iso3
  const iso3Matches = data.filter((lang) => isSubstring(query, lang.iso3_code));
  iso3Matches.forEach((match) => {
    scores[match.name] = Math.max(scores[match.name] || 0, 100);
  });

  // match iso1: we only consider exact match for iso1_code
  const iso1Matches = data.filter((lang) => {
    if (lang.iso1_code) {
      return query === lang.iso1_code;
    }
    return false;
  });
  iso1Matches.forEach((match) => {
    scores[match.name] = Math.max(scores[match.name] || 0, 100);
  });

  // match names: exact match of a name will have the highest score, decreases by distance
  const nameMatches = data.filter((lang) => hasCommonString(query, lang.name));
  nameMatches.forEach((match) => {
    const score = 101 - Math.abs(match.name.length - query.length);
    scores[match.name] = Math.max(scores[match.name] || 0, score);
  });

  // Sort by score
  const result = Object.entries(scores)
    .sort((obj1, obj2) => obj2[1] - obj1[1])
    .map((obj) => {
      const code = languages.get(obj[0]);
      if (!code) {
        throw new Error("Something went wrong when searching");
      }
      return code;
    });

  return result;
};

/**
 * A drawer for system output submission
 * @param props.onClose
 * @param props.visible
 * @params supports all other drawer props
 *
 */
export function SystemSubmitDrawer(props: Props) {
  const [state, setState] = useState(State.loading);
  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);
  const [languageCodes, setLanguageCodes] = useState<LanguageCode[]>([]);
  const { filtered: inputLangFiltered, setQuery: setInputLangQuery } =
    useSearch<LanguageCode>(languageCodes, filterFunc);
  const { filtered: outputLangFiltered, setQuery: setOutputLangQuery } =
    useSearch<LanguageCode>(languageCodes, filterFunc);
  const [datasetOptions, setDatasetOptions] = useState<DatasetMetadata[]>([]);
  const [useCustomDataset, setUseCustomDataset] = useState(false);
  const [otherSourceLang, setOtherSourceLang] = useState(false);
  const [otherTargetLang, setOtherTargetLang] = useState(false);

  const [form] = useForm<FormData>();
  const { systemToEdit, onClose, ...rest } = props;
  const editMode = systemToEdit !== undefined;

  const resetAllFormFields = useCallback(() => {
    form.resetFields();
  }, [form]);

  useEffect(() => {
    async function fetchTasks() {
      setState(State.loading);
      setTaskCategories(await backendClient.tasksGet());
      setLanguageCodes(await backendClient.languageCodesGet());
      setState(State.other);
    }

    fetchTasks();
    resetAllFormFields();
  }, [editMode, resetAllFormFields]);

  const selectedTaskName = form.getFieldValue("task");
  const selectedTask = findTask(taskCategories, selectedTaskName);
  const allowedFileType = selectedTask?.supported_formats || {
    system_output: [],
    custom_dataset: [],
  };

  /**
   * Fetch datasets that match the selected task (max: 30)
   *   - if taskName is not specified, use `selectedTaskName`. taskName can be used
   * when state update isn't complete
   *
   * TODO:
   * 1. add debounce
   * 2. error handling
   * */
  async function searchDatasets(text: string, taskName = "") {
    setState(State.loading);
    const { datasets } = await backendClient.datasetsGet(
      undefined,
      text,
      taskName || selectedTaskName,
      0,
      30
    );
    setDatasetOptions(datasets);
    setState(State.other);
  }

  async function extractAndEncodeFile(fileValue: DataFileValue) {
    const fileList = unwrap(fileValue.fileList);
    const file = fileList[0].originFileObj;
    if (file == null) throw new Error("file is undefined");
    return ((await toBase64(file)) as string).split(",")[1];
  }

  async function extractAndEncodeAllFiles(fileValue: DataFileValue) {
    const fileList = unwrap(fileValue.fileList);
    const sysNames = unwrap(fileValue.sysNames);

    // A list of system name and base 64 string
    const sysSubmitList: SysToSubmit[] = [];
    for (const file of fileList) {
      const fileObj = file.originFileObj;
      if (fileObj == null) throw new Error("Some file is undefined");
      const fileBase64 = ((await toBase64(fileObj)) as string).split(",")[1];
      sysSubmitList.push({ sysName: sysNames[file.uid], base64: fileBase64 });
    }
    return sysSubmitList;
  }

  /**
   *
   * TODO:
   * 1. a more robust way to get file extension
   */
  async function submit({
    name,
    task,
    dataset,
    metric_names,
    source_language,
    target_language,
    other_source_language,
    other_target_language,
    sys_out_file,
    custom_dataset_file,
    shared_users,
    is_private,
    system_details,
  }: FormData) {
    try {
      setState(State.loading);

      const trimmedUsers =
        shared_users === undefined
          ? undefined
          : shared_users.map((user) => user.trim());

      if (editMode) {
        await backendClient.systemsUpdateById(
          {
            metadata: {
              system_name: name,
              is_private,
              shared_users: trimmedUsers,
              system_details: { __TO_PARSE__: system_details },
            },
          },
          systemToEdit.system_id
        );
        ReactGA.event({
          category: "System",
          action: `system_update_success`,
        });
        message.success(
          `Successfully updated system (${systemToEdit.system_id}).`
        );
      } else {
        const sysSubmitList = await extractAndEncodeAllFiles(sys_out_file);
        const systems: System[] = [];

        for (const sysToSubmit of Object.values(sysSubmitList)) {
          let system;
          source_language =
            source_language === "other"
              ? "other-" + other_source_language
              : source_language;
          target_language =
            target_language === "other"
              ? "other-" + other_target_language
              : target_language;
          if (useCustomDataset) {
            const customDatasetBase64 = await extractAndEncodeFile(
              custom_dataset_file
            );
            system = await backendClient.systemsPost({
              metadata: {
                metric_names,
                system_name: sysToSubmit.sysName,
                task: task,
                source_language,
                target_language,
                is_private,
                shared_users: trimmedUsers,
                system_details: { __TO_PARSE__: system_details },
              },
              system_output: {
                data: sysToSubmit.base64,
                file_type: unwrap(sys_out_file.fileType),
              },
              custom_dataset: {
                data: customDatasetBase64,
                file_type: unwrap(custom_dataset_file.fileType),
              },
            });
          } else {
            const { datasetID, split } = dataset;
            system = await backendClient.systemsPost({
              metadata: {
                dataset_metadata_id: datasetID,
                dataset_split: split,
                metric_names,
                system_name: sysToSubmit.sysName,
                task: task,
                source_language,
                target_language,
                is_private,
                shared_users: trimmedUsers,
                system_details: { __TO_PARSE__: system_details },
              },
              system_output: {
                data: sysToSubmit.base64,
                file_type: unwrap(sys_out_file.fileType),
              },
            });
            systems.push(system);
          }
        }

        ReactGA.event({
          category: "System",
          action: `system_submit_success`,
          label: task,
        });
        message.success(
          `Successfully submitted systems (${systems.map(
            (system) => system.system_id
          )}).`
        );
        resetAllFormFields();
        onClose();
      }
    } catch (e) {
      if (editMode) {
        ReactGA.event({
          category: "System",
          action: `system_update_failure`,
        });
      } else {
        ReactGA.event({
          category: "System",
          action: `system_submit_failure`,
          label: task,
        });
      }
      if (e instanceof Response) {
        const err = await parseBackendError(e);
        message.error(err.getErrorMsg());
      } else {
        console.dir(e);
        message.error("[InternalError] Please contact admin");
      }
    } finally {
      setState(State.other);
    }
  }

  function getDatasetFromId(datasetID: string) {
    return datasetOptions.find((d) => d.dataset_id === datasetID);
  }

  function onSourceLangChange(lang: string | undefined) {
    setOtherSourceLang(lang === "other");
  }

  function onTargetLangChange(lang: string | undefined) {
    setOtherTargetLang(lang === "other");
  }

  function getLangCode(code: string) {
    if (code.length === 2) {
      const match = languageCodes.find((lang: LanguageCode) =>
        lang.iso1_code ? lang.iso1_code === code : false
      );
      if (match !== undefined) {
        return match.iso3_code;
      }
    }
    return code;
  }

  function onValuesChange(changedFields: Partial<FormData>) {
    if (changedFields.task != null) {
      searchDatasets("", changedFields.task);
      setDatasetOptions([]);
      // clear dataset and metric_names selections
      form.setFieldsValue({
        dataset: { datasetID: undefined, split: undefined },
        metric_names: [],
      });
    }
    if (changedFields.dataset != null) {
      const datasetID = changedFields.dataset.datasetID;
      if (datasetID != null) {
        const datasetMetadata = getDatasetFromId(datasetID);
        const langs = datasetMetadata?.languages;
        if (langs != null && langs.length > 0) {
          const target_idx = langs.length === 2 ? 1 : 0;
          form.setFieldsValue({
            source_language: getLangCode(langs[0]),
            other_source_language: undefined,
            target_language: getLangCode(langs[target_idx]),
            other_target_language: undefined,
          });
          onSourceLangChange(langs[0]);
          onTargetLangChange(langs[target_idx]);
        } else {
          form.setFieldsValue({
            source_language: undefined,
            other_source_language: undefined,
            target_language: undefined,
            other_target_language: undefined,
          });
          onSourceLangChange(undefined);
          onTargetLangChange(undefined);
        }
      }
    }
  }

  const footer = (
    <Space>
      <Button
        type="primary"
        onClick={() => form.submit()}
        loading={state === State.loading}
      >
        Submit
      </Button>
      <Button onClick={() => onClose()} loading={state === State.loading}>
        Cancel
      </Button>
    </Space>
  );

  function onUseCustomDatasetChange(checked: boolean) {
    setUseCustomDataset(checked);
    if (checked)
      form.setFieldsValue({
        dataset: { datasetID: undefined, split: undefined },
      });
  }

  function getDataFileValidator(isRequired: boolean, fieldName: string) {
    if (!isRequired) return () => Promise.resolve();
    else
      return (_: unknown, value: DataFileValue) => {
        if (value && value.fileList && value.fileType) return Promise.resolve();
        else return Promise.reject(`'${fieldName}' and file type are required`);
      };
  }

  function validateDataset(_: unknown, value: DatasetValue) {
    if (useCustomDataset) return Promise.resolve();
    else {
      if (value && value.datasetID && value.split) return Promise.resolve();
      else return Promise.reject("Dataset name and split are required");
    }
  }

  function validateSharedUsers(_: unknown, users: string[]) {
    if (users === undefined) {
      return Promise.resolve();
    }
    const validRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    for (const user of users) {
      if (!user.trim().match(validRegex)) {
        return Promise.reject(`${user} not a valid email`);
      }
    }
    return Promise.resolve();
  }

  const monospaceStyle = {
    fontFamily: "monospace",
  };

  return (
    <Drawer
      width="60%"
      title={editMode ? "Edit System" : "New System"}
      footer={footer}
      onClose={onClose}
      {...rest}
    >
      <Spin spinning={state === State.loading} tip="processing...">
        <Form
          labelCol={{ span: 7 }}
          onFinish={submit}
          form={form}
          scrollToFirstError
          onValuesChange={onValuesChange}
          initialValues={
            editMode
              ? {
                  name: systemToEdit?.system_info.system_name,
                  // Must be boolean
                  is_private: systemToEdit?.is_private || false,
                  shared_users: systemToEdit?.shared_users,
                }
              : { is_private: true }
          }
        >
          <Form.Item
            name="name"
            label="System Name"
            rules={editMode ? [{ required: true }] : []}
            hidden={!editMode}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="task"
            label="Task"
            rules={editMode ? [] : [{ required: true }]}
            help={
              selectedTask && (
                <Tooltip
                  title={
                    <TextWithLink
                      text={selectedTask.description}
                      target="_blank"
                    />
                  }
                  placement="left"
                  color="white"
                  overlayInnerStyle={{ color: "black" }}
                >
                  <Button type="link" size="small" style={{ padding: 0 }}>
                    Need help generating system output?
                  </Button>
                </Tooltip>
              )
            }
            hidden={editMode}
          >
            <TaskSelect taskCategories={taskCategories} />
          </Form.Item>

          <Form.Item
            label="Use custom dataset?"
            tooltip="Custom dataset will not be shown on the leaderboard"
            hidden={editMode}
          >
            <Checkbox
              checked={useCustomDataset}
              onChange={(e) => onUseCustomDatasetChange(e.target.checked)}
              disabled={editMode}
            />
          </Form.Item>

          {useCustomDataset ? (
            <>
              <Form.Item
                name="custom_dataset_file"
                label="Custom Dataset"
                rules={
                  editMode
                    ? []
                    : [
                        { required: true },
                        {
                          validator: getDataFileValidator(
                            useCustomDataset,
                            "Custom Dataset"
                          ),
                        },
                      ]
                }
                hidden={editMode}
              >
                <DataFileUpload
                  allowedFileTypes={allowedFileType.custom_dataset}
                />
              </Form.Item>
            </>
          ) : (
            <Form.Item
              name="dataset"
              label="Dataset"
              rules={
                editMode ? [] : [{ required: true, validator: validateDataset }]
              }
              hidden={editMode}
            >
              <DatasetSelect
                options={datasetOptions}
                disabled={selectedTaskName == null}
                onSearchDataset={(query) => searchDatasets(query)}
              />
            </Form.Item>
          )}

          <Form.Item
            name="sys_out_file"
            label="System Output"
            rules={
              editMode
                ? []
                : [
                    { required: true },
                    { validator: getDataFileValidator(true, "System Output") },
                  ]
            }
            hidden={editMode}
          >
            <DataFileUpload
              allowedFileTypes={allowedFileType.system_output}
              maxFileCount={10}
            />
          </Form.Item>

          <Form.Item
            name="metric_names"
            label="Metrics"
            rules={editMode ? [] : [{ required: true }]}
            hidden={editMode}
          >
            <Select
              mode="multiple"
              options={(selectedTask?.supported_metrics || []).map((opt) => ({
                value: opt,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="is_private"
            label="Make it private?"
            rules={[{ required: true }]}
            valuePropName="checked"
            tooltip="Check this box if you don't want other users to see your system (We will add support to change the visibility of systems in the future)"
          >
            <Checkbox />
          </Form.Item>

          <Form.Item
            name="shared_users"
            label="Shared Users"
            tooltip="Enter the email addresses of the users you'd like to share with, pressing enter after each one."
            rules={[{ validator: validateSharedUsers }]}
          >
            <Select mode="tags" />
          </Form.Item>

          <Row>
            <Col span={4}>&nbsp;</Col>
            <Col span={10}>
              <Form.Item
                name="source_language"
                label="Input Language"
                rules={editMode ? [] : [{ required: true }]}
                hidden={editMode}
                tooltip="Choose the input/output languages of the dataset. Select 'Other(other)' if the dataset uses custom languages. Select 'None(none)' if the dataset contains other modalities like images. "
              >
                <Select
                  showSearch
                  options={inputLangFiltered.map((opt) => ({
                    label: `${opt.name}(${opt.iso3_code})`,
                    value: opt.iso3_code,
                  }))}
                  placeholder="Search language"
                  filterOption={() => true}
                  onSearch={setInputLangQuery}
                  onChange={onSourceLangChange}
                />
              </Form.Item>
              {otherSourceLang && (
                <Form.Item
                  name="other_source_language"
                  label="Other Language"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Enter custom language" />
                </Form.Item>
              )}
            </Col>
            <Col span={10}>
              <Form.Item
                name="target_language"
                label="Output Language"
                rules={editMode ? [] : [{ required: true }]}
                hidden={editMode}
              >
                <Select
                  showSearch
                  options={outputLangFiltered.map((opt) => ({
                    label: `${opt.name}(${opt.iso3_code})`,
                    value: opt.iso3_code,
                  }))}
                  placeholder="Search language"
                  filterOption={() => true}
                  onSearch={setOutputLangQuery}
                  onChange={onTargetLangChange}
                />
              </Form.Item>
              {otherTargetLang && (
                <Form.Item
                  name="other_target_language"
                  label="Other Language"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Enter custom language" />
                </Form.Item>
              )}
            </Col>
          </Row>

          <Form.Item
            name="system_details"
            label="System Details"
            tooltip={
              <>
                <p>
                  Enter any details you want to record about the system. This
                  can be done in one of two formats.
                </p>
                <p>
                  <b>- Colon Separated -</b>
                  <br />
                  <div style={monospaceStyle}>
                    url: https://...
                    <br />
                    arch: transformer
                  </div>
                </p>
                <p>
                  <b>- JSON -</b>
                  <br />
                  <div style={monospaceStyle}>
                    &#123;
                    <br />
                    &nbsp;&quot;url&quot;: &quot;https://...&quot;,
                    <br />
                    &nbsp;&quot;arch&quot;: &quot;transformer&quot;
                    <br />
                    &#125;
                  </div>
                </p>
              </>
            }
            hidden={editMode}
          >
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Spin>
    </Drawer>
  );
}

interface FormData {
  name: string;
  task: string;
  dataset: DatasetValue;
  sys_out_file: DataFileValue;
  custom_dataset_file: DataFileValue;

  metric_names: string[];
  source_language: string;
  target_language: string;
  other_source_language: string;
  other_target_language: string;
  is_private: boolean;
  system_details: string;
  shared_users: string[];
}
