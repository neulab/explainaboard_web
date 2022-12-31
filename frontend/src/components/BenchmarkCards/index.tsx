import React, { useState } from "react";
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
  Radio,
  message,
} from "antd";
import { BenchmarkConfig } from "../../clients/openapi";
import { Helmet } from "react-helmet";
import { NewResourceButton } from "../../components/Button";
import { BenchmarkSubmitDrawer } from "../BenchmarkSubmitDrawer";
import { backendClient, parseBackendError } from "../../clients";
import { DeleteOutlined } from "@ant-design/icons";
import { useUser } from "../useUser";
import { FilterUpdate } from "../../pages/BenchmarkPage/BenchmarkFilter";

interface Props {
  items: Array<BenchmarkConfig>;
  isAtRootPage: boolean;
  showFeatured: boolean;
  onFilterChange: (value: FilterUpdate) => void;
}

export function BenchmarkCards({
  items,
  isAtRootPage,
  showFeatured,
  onFilterChange,
}: Props) {
  const { userInfo } = useUser();
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

  const featuredVsAllOptions = [
    { label: "Featured", value: true, disabled: !isAtRootPage },
    { label: "All", value: false, disabled: !isAtRootPage },
  ];

  const featuredVsAllBenchmarksToggle = (
    <Radio.Group
      options={featuredVsAllOptions}
      onChange={({ target: { value } }) => {
        onFilterChange({ showFeatured: value });
      }}
      value={showFeatured}
      optionType="button"
      buttonStyle="solid"
    />
  );

  return (
    <div className="page">
      <Helmet>
        <title>ExplainaBoard - Benchmarks</title>
      </Helmet>
      <PageHeader
        onBack={() => onFilterChange({ parentId: "" })}
        title="Benchmarks"
        subTitle="Select a benchmark"
      />
      <Row justify="space-between" style={{ marginBottom: "10px" }}>
        <Space>{featuredVsAllBenchmarksToggle}</Space>
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
                onClick={() => {
                  onFilterChange({ parentId: config.id, showFeatured: false });
                }}
                cover={
                  <img
                    alt="example"
                    style={{ height: 200 }}
                    src={config.logo}
                  />
                }
              >
                <Row>Creator: {config.preferred_username}</Row>
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
