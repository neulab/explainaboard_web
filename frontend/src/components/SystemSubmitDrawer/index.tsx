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
import { DatasetMetadata, SystemOutputProps } from "../../clients/openapi";
import { backendClient } from "../../clients";
import { toBase64 } from "../../utils";
import { UploadOutlined } from "@ant-design/icons";
import { RcFile } from "antd/lib/upload";
import { useForm } from "antd/lib/form/Form";

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
 * TODO:
 * 1. add loading for search
 * 2. [bug] select file -> remove -> form validation won't be updated
 * 3. clean up form item if submission successful so we don't have to destry drawer on close.
 */
export function SystemSubmitDrawer(props: Props) {
  const [state, setState] = useState(State.loading);
  const [selectedTask, setSelectedTask] = useState<string>();
  const [tasks, setTasks] = useState<string[]>([]);
  const [selectedDatasetID, setSelectedDatasetID] = useState<string>();
  const [datasetOptions, setDatasetOptions] = useState<DatasetMetadata[]>([]);
  const [systemOutFile, setSystemOutFile] = useState<RcFile>();

  const [form] = useForm();
  const { onClose } = props;

  useEffect(() => {
    async function fetchTasks() {
      setTasks(await backendClient.tasksGet());
      setState(State.other);
    }
    fetchTasks();
  }, []);

  function selectTask(task_name: string) {
    setSelectedTask(task_name);
    setDatasetOptions([]);
    setSelectedDatasetID(undefined);
  }

  /** TODO: add debounce */
  async function searchDatasets(text: string) {
    const { datasets } = await backendClient.datasetsGet(
      text,
      selectedTask,
      0,
      30
    );
    setDatasetOptions(datasets);
  }

  /**
   *
   * TODO:
   * 1. a more robust way to get file extension
   */
  async function submit({ name }: { name: string }) {
    if (selectedDatasetID && systemOutFile && selectedTask) {
      try {
        setState(State.loading);
        const systemOutBase64 = (
          (await toBase64(systemOutFile)) as string
        ).split(",")[1];
        const fileExtension = systemOutFile.name.split(".")[1];
        const system = await backendClient.systemsPost({
          metadata: {
            dataset_metadata_id: selectedDatasetID,
            metric_names: ["Accuracy"],
            model_name: name,
            paper_info: {},
            task: selectedTask,
          },
          system_output: {
            data: systemOutBase64,
            file_type:
              fileExtension as unknown as SystemOutputProps.FileTypeEnum,
          },
        });
        message.success(`Successfully submitted system (${system.system_id}).`);
        onClose();
      } catch (e) {
        console.error(e);
        message.error("Error. Please submit again.");
      } finally {
        setState(State.other);
      }
    } else {
      message.error("[fe] missing required parameters");
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

  return (
    <Drawer
      width="50%"
      title="New System"
      footer={footer}
      destroyOnClose
      {...props}
    >
      <Spin spinning={state === State.loading}>
        <Form name="test" labelCol={{ span: 7 }} onFinish={submit} form={form}>
          <Form.Item
            name="name"
            label="System Name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="task" label="Task" rules={[{ required: true }]}>
            <Select
              value={selectedTask}
              showSearch
              options={tasks.map((task) => ({
                value: task,
                label: task,
              }))}
              onSelect={(value) => selectTask(value)}
            />
          </Form.Item>

          <Form.Item
            name="dataset"
            label="Dataset"
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              value={selectedDatasetID}
              placeholder="Please search dataset by name"
              options={datasetOptions.map((dataset) => ({
                value: dataset.dataset_id,
                label: dataset.dataset_name,
              }))}
              onSearch={searchDatasets}
              disabled={selectedTask == null}
              onSelect={(value) => setSelectedDatasetID(value)}
              filterOption={false} // disable local filter
            />
          </Form.Item>

          <Form.Item
            name="sys_out_file"
            label="System Output"
            rules={[{ required: true }]}
          >
            <Upload
              fileList={systemOutFile ? [systemOutFile] : undefined}
              maxCount={1}
              onRemove={() => setSystemOutFile(undefined)}
              beforeUpload={(file) => {
                setSystemOutFile(file);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
          </Form.Item>
          <Form.Item
            name="metric_names"
            label="Metrics"
            initialValue="Accuracy"
            rules={[{ required: true }]}
          >
            <Select options={[{ value: "Accuracy" }]} />
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
