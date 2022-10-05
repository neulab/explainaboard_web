import React, { useEffect, useState } from "react";
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

const { TextArea } = Input;

interface Props extends DrawerProps {
  onClose: () => void;
  visible: boolean;
}

enum State {
  loading,
  other,
}

function biDirectionalMatch(one: string, other: string): boolean {
  return isMatch(one, other) || isMatch(other, one);
}
function isMatch(query: string, string: string): boolean {
  return string.toLowerCase().includes(query.toLocaleLowerCase());
}

type LangScore = {
  lang: LanguageCode;
  value: number;
};

const filterFunc: FilterFunc<LanguageCode> = (query, data) => {
  const added = new Set<string>();
  const scores: LangScore[] = [];

  // match iso3
  const iso3Matches = data.filter((lang) => isMatch(query, lang.iso3_code));
  iso3Matches.forEach((match) => {
    added.add(match.name);
    scores.push({ lang: match, value: 100 });
  });

  // match iso1: we only consider exact match for iso1_code
  const iso1Matches = data.filter((lang) => {
    if (lang.iso1_code) {
      return query === lang.iso1_code;
    }
    return false;
  });
  iso1Matches.forEach((match) => {
    added.add(match.name);
    if (!added.has(match.name)) scores.push({ lang: match, value: 100 });
  });

  // match names: exact match of a name will have the highest score, decreases by distance
  const nameMatches = data.filter((lang) =>
    biDirectionalMatch(query, lang.name)
  );
  nameMatches.forEach((match) => {
    if (!added.has(match.name))
      scores.push({
        lang: match,
        value: 101 - Math.abs(match.name.length - query.length),
      });
  });

  // Sort by score
  const result = scores
    .sort((score1, score2) => score2.value - score1.value)
    .map((score) => score.lang);

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
  const { onClose } = props;

  useEffect(() => {
    async function fetchTasks() {
      setTaskCategories(await backendClient.tasksGet());
      setLanguageCodes(await backendClient.languageCodesGet());
      setState(State.other);
    }
    fetchTasks();
  }, []);

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
      const systemOutBase64 = await extractAndEncodeFile(sys_out_file);
      let system: System;
      const trimmedUsers =
        shared_users === undefined
          ? undefined
          : shared_users.map((user) => user.trim());
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
            system_name: name,
            task: task,
            source_language,
            target_language,
            is_private,
            shared_users: trimmedUsers,
            system_details: { __TO_PARSE__: system_details },
          },
          system_output: {
            data: systemOutBase64,
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
            system_name: name,
            task: task,
            source_language,
            target_language,
            is_private,
            shared_users: trimmedUsers,
            system_details: { __TO_PARSE__: system_details },
          },
          system_output: {
            data: systemOutBase64,
            file_type: unwrap(sys_out_file.fileType),
          },
        });
      }

      ReactGA.event({
        category: "System",
        action: `system_submit_success`,
        label: task,
      });
      message.success(`Successfully submitted system (${system.system_id}).`);
      onClose();
      form.resetFields([
        "name",
        "task",
        "dataset",
        "sys_out_file",
        "custom_dataset_file",
        "metric_names",
        "source_language",
        "target_language",
        "other_source_language",
        "other_target_language",
        "shared_users",
        "system_details",
      ]);
    } catch (e) {
      ReactGA.event({
        category: "System",
        action: `system_submit_failure`,
        label: task,
      });
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
      title="New System"
      footer={footer}
      destroyOnClose
      {...props}
    >
      <Spin spinning={state === State.loading} tip="processing...">
        <Form
          labelCol={{ span: 7 }}
          onFinish={submit}
          form={form}
          scrollToFirstError
          onValuesChange={onValuesChange}
        >
          <Form.Item
            name="name"
            label="System Name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="task"
            label="Task"
            rules={[{ required: true }]}
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
          >
            <TaskSelect taskCategories={taskCategories} />
          </Form.Item>

          <Form.Item
            label="Use custom dataset?"
            tooltip="Custom dataset will not be shown on the leaderboard"
          >
            <Checkbox
              checked={useCustomDataset}
              onChange={(e) => onUseCustomDatasetChange(e.target.checked)}
            />
          </Form.Item>

          {useCustomDataset ? (
            <>
              <Form.Item
                name="custom_dataset_file"
                label="Custom Dataset"
                required
                rules={[
                  {
                    validator: getDataFileValidator(
                      useCustomDataset,
                      "Custom Dataset"
                    ),
                  },
                ]}
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
              required
              rules={[{ validator: validateDataset }]}
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
            required
            rules={[{ validator: getDataFileValidator(true, "System Output") }]}
          >
            <DataFileUpload allowedFileTypes={allowedFileType.system_output} />
          </Form.Item>

          <Form.Item
            name="metric_names"
            label="Metrics"
            rules={[{ required: true }]}
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
            initialValue={true}
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
                rules={[{ required: true }]}
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
                rules={[{ required: true }]}
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
