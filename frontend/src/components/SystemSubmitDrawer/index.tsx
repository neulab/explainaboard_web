import React, { useEffect, useState } from "react";
import {
  Button,
  Drawer,
  Select,
  DrawerProps,
  Form,
  Input,
  Upload,
  message,
  Space,
  Spin,
  Radio,
  CheckboxOptionType,
  Tooltip,
  Checkbox,
} from "antd";
import { DatasetMetadata, TaskCategory } from "../../clients/openapi";
import { backendClient, parseBackendError } from "../../clients";
import { findTask, toBase64 } from "../../utils";
import { UploadOutlined } from "@ant-design/icons";
import { useForm } from "antd/lib/form/Form";
import { UploadFile } from "antd/lib/upload/interface";
import { TaskSelect, TextWithLink } from "..";

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
  const allowedFileType = selectedTask?.supported_formats || [];

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
      text,
      taskName || selectedTaskName,
      0,
      30
    );
    setDatasetOptions(datasets);
    setState(State.other);
  }

  /**
   *
   * TODO:
   * 1. a more robust way to get file extension
   */
  async function submit({
    name,
    task,
    dataset_id,
    metric_names,
    language,
    sys_out_file_list,
    code,
    fileType,
    is_private,
  }: FormData) {
    try {
      setState(State.loading);
      const file = sys_out_file_list[0].originFileObj;
      if (file == null) throw Error("file is undefined");
      const systemOutBase64 = ((await toBase64(file)) as string).split(",")[1];
      const system = await backendClient.systemsPost({
        metadata: {
          dataset_metadata_id: dataset_id || undefined,
          metric_names,
          model_name: name,
          paper_info: {},
          task: task,
          language,
          code,
          is_private,
        },
        system_output: {
          data: systemOutBase64,
          file_type: fileType,
        },
      });
      message.success(`Successfully submitted system (${system.system_id}).`);
      onClose();
      form.resetFields([
        "name",
        "task",
        "dataset_id",
        "metric_names",
        "language",
        "code",
        "sys_out_file_list",
        "fileType",
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

  function onValuesChange(changedFields: Partial<FormData>) {
    if (changedFields.task != null) {
      searchDatasets("", changedFields.task);
      setDatasetOptions([]);
      // clear dataset and metric_names selections
      form.setFieldsValue({ dataset_id: undefined, metric_names: [] });
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

  /**
   * 1. take an event and returns the filelist
   * 2. determines file type according to file extension. user can also override the file type selection
   * */
  function normalizeFile(e: { file: File; fileList: UploadFile[] }) {
    const fileList = e && e.fileList;
    if (!fileList || fileList.length === 0) return undefined;
    let fileExtension = fileList[0].name.split(".")[1].toLowerCase();
    if (fileExtension === "jsonl") fileExtension = "json"; // SDK treats them the same
    const fileType = FILE_TYPES.find((type) => type.value === fileExtension);
    if (fileType && allowedFileType.includes(fileType.value as string)) {
      form.setFieldsValue({ fileType: fileType.value as string });
    }
    return fileList;
  }

  return (
    <Drawer
      width="50%"
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
            name="dataset_id"
            label="Dataset"
            help="Please leave this field blank if you couldn't find the dataset"
          >
            <Select
              showSearch
              allowClear
              placeholder="Please search dataset by name"
              options={datasetOptions.map((dataset) => ({
                value: dataset.dataset_id,
                label: dataset.dataset_name,
              }))}
              onSearch={searchDatasets}
              disabled={selectedTaskName == null}
              filterOption={false} // disable local filter
            />
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
            name="sys_out_file_list"
            label="System Output"
            rules={[{ required: true }]}
            valuePropName="fileList"
            getValueFromEvent={normalizeFile}
          >
            <Upload
              maxCount={1}
              beforeUpload={(file) => {
                return false;
              }}
            >
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="fileType"
            label="File Type"
            rules={[{ required: true }]}
          >
            <Radio.Group
              options={FILE_TYPES.map((type) => ({
                ...type,
                disabled: !allowedFileType.includes(type.value as string),
              }))}
            />
          </Form.Item>
          <Form.Item
            name="is_private"
            label="Make it private?"
            initialValue={true}
            rules={[{ required: true }]}
            valuePropName="checked"
          >
            <Checkbox />
          </Form.Item>

          <Form.Item
            name="language"
            label="Language"
            initialValue="en"
            rules={[{ required: true }]}
          >
            <Select options={[{ value: "en" }]} />
          </Form.Item>
          <Form.Item name="code" label="Code">
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
  dataset_id: string;
  metric_names: string[];
  language: string;
  code: string;
  sys_out_file_list: UploadFile[];
  fileType: string;
  is_private: boolean;
}

const FILE_TYPES: CheckboxOptionType[] = [
  { value: "csv", label: "CSV" },
  { value: "tsv", label: "TSV" },
  { value: "json", label: "JSON or JSON Line" },
  { value: "conll", label: "CoNLL" },
];
