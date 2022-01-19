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
} from "antd";
import {
  DatasetMetadata,
  SystemOutputProps,
  TaskCategory,
} from "../../clients/openapi";
import { backendClient, parseBackendError } from "../../clients";
import { toBase64 } from "../../utils";
import { UploadOutlined } from "@ant-design/icons";
import { useForm } from "antd/lib/form/Form";
import { UploadFile } from "antd/lib/upload/interface";

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

  const selectedTask = form.getFieldValue("task");
  const metricsOptions = findMetricsOptions();

  /** find the selected task in task info and return supported metrics */
  function findMetricsOptions(): string[] {
    if (selectedTask == null) return [];
    for (const category of taskCategories) {
      const task = category.tasks.find(({ name }) => name === selectedTask);
      if (task) return task.supported_metrics;
    }
    return [];
  }

  /**
   * Fetch datasets that match the selected task (max: 30)
   * TODO:
   * 1. add debounce
   * 2. error handling
   * */
  async function searchDatasets(text: string) {
    setState(State.loading);
    const { datasets } = await backendClient.datasetsGet(
      text,
      selectedTask,
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
  }: FormData) {
    try {
      setState(State.loading);
      const file = sys_out_file_list[0].originFileObj;
      if (file == null) throw Error("file is undefined");
      const systemOutBase64 = ((await toBase64(file)) as string).split(",")[1];
      const fileExtension = file.name.split(".")[1];
      const system = await backendClient.systemsPost({
        metadata: {
          dataset_metadata_id: dataset_id,
          metric_names,
          model_name: name,
          paper_info: {},
          task: task,
          language,
          code,
        },
        system_output: {
          data: systemOutBase64,
          file_type: fileExtension as unknown as SystemOutputProps.FileTypeEnum,
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

  /** take an event and returns the filelist */
  function normalizeFile(e: { file: File; fileList: UploadFile[] }) {
    return e && e.fileList;
  }

  return (
    <Drawer
      width="50%"
      title="New System"
      footer={footer}
      destroyOnClose
      {...props}
    >
      <Spin spinning={state === State.loading} tip="loading...">
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

          <Form.Item name="task" label="Task" rules={[{ required: true }]}>
            <Select showSearch>
              {taskCategories.map(({ name, tasks }) => (
                <Select.OptGroup label={name} key={name}>
                  {tasks.map(({ name, supported }) => (
                    <Select.Option
                      value={name}
                      key={name}
                      disabled={!supported}
                    >
                      {name}
                    </Select.Option>
                  ))}
                </Select.OptGroup>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="dataset_id"
            label="Dataset"
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              placeholder="Please search dataset by name"
              options={datasetOptions.map((dataset) => ({
                value: dataset.dataset_id,
                label: dataset.dataset_name,
              }))}
              onSearch={searchDatasets}
              disabled={selectedTask == null}
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
              options={metricsOptions.map((opt) => ({ value: opt }))}
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
}
