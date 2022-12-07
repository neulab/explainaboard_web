import React, { useState } from "react";
import {
  Drawer,
  message,
  DrawerProps,
  Space,
  Button,
  Spin,
  Row,
  Col,
} from "antd";
import { CodeBlock, dracula } from "react-code-blocks";
import TextareaAutosize from "react-textarea-autosize";
import ReactGA from "react-ga4";

// eslint-disable-next-line import/no-webpack-loader-syntax
import benchmarkConfigString from "raw-loader!./benchmark_config.js";
import { backendClient, parseBackendError } from "../../clients";

interface Props extends DrawerProps {
  onClose: () => void;
  visible: boolean;
}

enum State {
  loading,
  other,
}

export function BenchmarkSubmitDrawer(props: Props) {
  const [state, setState] = useState(State.other);
  const [input, setInput] = useState(benchmarkConfigString);

  const { onClose, visible, ...rest } = props;

  async function submit() {
    try {
      setState(State.loading);
      const benchmark = await backendClient.benchmarkPost(JSON.parse(input));
      ReactGA.event({
        category: "Benchmark",
        action: `benchmark_submit_success`,
      });
      message.success(`Successfully submitted benchmark (${benchmark.id})}).`);
      setInput(benchmarkConfigString);
      onClose();
    } catch (e) {
      if (e instanceof SyntaxError) {
        message.error(e.message);
      } else if (e instanceof Response) {
        const err = await parseBackendError(e);
        message.error(err.getErrorMsg());
      } else {
        console.error(e);
        message.error("[InternalError] Please contact admin");
      }
    } finally {
      setState(State.other);
    }
  }

  const footer = (
    <Space>
      <Button
        type="primary"
        onClick={() => submit()}
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
      title={"New Benchmark"}
      footer={footer}
      onClose={onClose}
      visible={visible}
      width="86%"
      {...rest}
    >
      <Spin spinning={state === State.loading} tip="processing...">
        <Row gutter={[16, 16]}>
          <Col span={12}>Editor</Col>
          <Col span={12}>Preview</Col>
        </Row>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <TextareaAutosize
              // this style is required to align the lines of code in textarea with
              // with those in code block
              style={{
                width: "100%",
                lineHeight: 1.66667,
                paddingTop: "8px",
              }}
              rows={benchmarkConfigString.split("\n").length}
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
            />
          </Col>
          <Col span={12}>
            <CodeBlock
              text={input}
              language="json"
              theme={dracula}
              showLineNumbers={false}
            />
          </Col>
        </Row>
      </Spin>
    </Drawer>
  );
}
