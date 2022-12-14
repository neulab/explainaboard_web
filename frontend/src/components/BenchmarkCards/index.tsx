import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import "./index.css";
import {
  Card,
  Col,
  PageHeader,
  Row,
  Typography,
  Space,
  Popconfirm,
  Button,
  message,
} from "antd";
import { BenchmarkConfig } from "../../clients/openapi";
import { Helmet } from "react-helmet";
import { NewResourceButton } from "../../components/Button";
import { BenchmarkSubmitDrawer } from "../BenchmarkSubmitDrawer";
import { backendClient, parseBackendError } from "../../clients";
import { DeleteOutlined } from "@ant-design/icons";
import { useUser } from "../useUser";

interface Props {
  items: Array<BenchmarkConfig>;
  subtitle: string;
}

export function BenchmarkCards({ items, subtitle }: Props) {
  const { userInfo } = useUser();
  const history = useHistory();
  const [submitDrawerVisible, setSubmitDrawerVisible] = useState(false);

  async function deleteBenchmark(benchmarkID: string) {
    try {
      await backendClient.benchmarkDeleteById(benchmarkID);
      message.success("Success");
      document.location.reload();
    } catch (e) {
      if (e instanceof Response) {
        message.error((await parseBackendError(e)).getErrorMsg());
      }
    }
  }

  function showSubmitDrawer() {
    setSubmitDrawerVisible(true);
  }

  return (
    <div className="page">
      <Helmet>
        <title>ExplainaBoard - Benchmarks</title>
      </Helmet>
      <PageHeader
        onBack={() => history.push("/")}
        title="Benchmarks"
        subTitle={subtitle}
      />
      <Row justify="end">
        <Space style={{ width: "fit-content", float: "right" }}>
          <NewResourceButton
            onClick={showSubmitDrawer}
            resourceName="benchmark"
          />
        </Space>
      </Row>
      <Row gutter={[16, 16]}>
        {items.map((config) => {
          const notCreator = config.creator !== userInfo?.id;
          return (
            <Col key={config.id} span={6}>
              <Card
                hoverable
                style={{
                  width: 240,
                }}
                className="benchmark-card"
                title={
                  <div style={{ textAlign: "center" }}>
                    <Typography.Title level={3}>{config.name}</Typography.Title>
                  </div>
                }
                onClick={() =>
                  history.push(`${document.location.pathname}?id=${config.id}`)
                }
                cover={
                  <img
                    alt="example"
                    style={{ height: 200 }}
                    src={config.logo}
                  />
                }
              >
                <Row justify="end">
                  <Popconfirm
                    disabled={notCreator}
                    title="Are you sure?"
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      deleteBenchmark(config.id);
                    }}
                  >
                    <Button
                      danger
                      disabled={notCreator}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      size="small"
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                </Row>
              </Card>
            </Col>
          );
        })}
      </Row>
      <BenchmarkSubmitDrawer
        visible={submitDrawerVisible}
        onClose={() => {
          setSubmitDrawerVisible(false);
        }}
      />
    </div>
  );
}
