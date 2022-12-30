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
import Editor from "react-simple-code-editor";
import ReactGA from "react-ga4";
import "./index.css";

import { CodeBlock, dracula } from "react-code-blocks";

// eslint-disable-next-line import/no-webpack-loader-syntax
import benchmarkConfigJson5 from "json5-loader!./benchmark_config.json5";
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
  const [input, setInput] = useState(benchmarkConfigJson5);

  const { onClose, visible, ...rest } = props;

  async function submit() {
    try {
      setState(State.loading);
      const benchmark = await backendClient.benchmarkPost(JSON.parse(input));
      ReactGA.event({
        category: "Benchmark",
        action: `benchmark_submit_success`,
      });
      message.success(`Successfully submitted benchmark (${benchmark.id})).`);
      setInput(benchmarkConfigJson5);
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
      width="50%"
      {...rest}
    >
      <Spin spinning={state === State.loading} tip="processing...">
        <Row>
          <Col style={{ width: "100%" }}>
            <Editor
              onValueChange={(input) => setInput(input)}
              highlight={(code) => (
                <CodeBlock
                  text={code}
                  language="json"
                  theme={dracula}
                  showLineNumbers={false}
                  customStyle={{
                    /* This style helps align react-code-blocks
                    with react-simple-code-editor. */
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                />
              )}
              textareaId="benchmark-submit-drawer-text-area"
              preClassName="benchmark-submit-drawer-pre"
              value={input}
            />
          </Col>
        </Row>
      </Spin>
    </Drawer>
  );
}
