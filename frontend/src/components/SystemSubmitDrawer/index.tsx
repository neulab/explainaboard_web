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
import { DatasetMetadata, System, TaskCategory } from "../../clients/openapi";
import { backendClient, parseBackendError } from "../../clients";
import { findTask, toBase64, unwrap } from "../../utils";
import { useForm } from "antd/lib/form/Form";
import { TaskSelect, TextWithLink } from "..";
import { DatasetSelect, DatasetValue } from "./DatasetSelect";
import { DataFileUpload, DataFileValue } from "./FileSelect";

interface Props extends DrawerProps {
  onClose: () => void;
  visible: boolean;
}

enum State {
  loading,
  other,
}

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
  const [datasetOptions, setDatasetOptions] = useState<DatasetMetadata[]>([]);
  const [useCustomDataset, setUseCustomDataset] = useState(false);

  const [form] = useForm<FormData>();
  const { onClose } = props;

  useEffect(() => {
    async function fetchTasks() {
      setTaskCategories(await backendClient.tasksGet());
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
    sys_out_file,
    custom_dataset_file,
    code,
    is_private,
  }: FormData) {
    try {
      setState(State.loading);
      const systemOutBase64 = await extractAndEncodeFile(sys_out_file);
      let system: System;
      if (useCustomDataset) {
        const customDatasetBase64 = await extractAndEncodeFile(
          custom_dataset_file
        );
        system = await backendClient.systemsPost({
          metadata: {
            metric_names,
            system_name: name,
            paper_info: {},
            task: task,
            source_language,
            target_language,
            code,
            is_private,
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
            paper_info: {},
            task: task,
            source_language,
            target_language,
            code,
            is_private,
          },
          system_output: {
            data: systemOutBase64,
            file_type: unwrap(sys_out_file.fileType),
          },
        });
      }

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
        "code",
      ]);
    } catch (e) {
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
            source_language: langs[0],
            target_language: langs[target_idx],
          });
        } else {
          form.setFieldsValue({
            source_language: undefined,
            target_language: undefined,
          });
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

          <Row>
            <Col span={5}>&nbsp;</Col>
            <Col span={9}>
              <Form.Item
                name="source_language"
                label="Input Lang"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={1}>&nbsp;</Col>
            <Col span={9}>
              <Form.Item
                name="target_language"
                label="Output Lang"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="code" label="Source Code Link">
            <Input type="url" />
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
  code: string;
  is_private: boolean;
}
