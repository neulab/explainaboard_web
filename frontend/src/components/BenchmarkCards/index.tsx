import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import "./index.css";
import { Card, Col, PageHeader, Row, Typography, Space } from "antd";
import { BenchmarkConfig } from "../../clients/openapi";
import { Helmet } from "react-helmet";
import { NewResourceButton } from "../../components/Button";
import { BenchmarkSubmitDrawer } from "../BenchmarkSubmitDrawer";

interface Props {
  items: Array<BenchmarkConfig>;
  subtitle: string;
}

export function BenchmarkCards({ items, subtitle }: Props) {
  const history = useHistory();
  const { Title } = Typography;
  const [submitDrawerVisible, setSubmitDrawerVisible] = useState(false);

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
        {items.map((config) => (
          <Col key={config.id} span={6}>
            <Card
              hoverable
              style={{
                width: 240,
              }}
              className="benchmark-card"
              title={
                <div style={{ textAlign: "center" }}>
                  <Title level={3}>{config.name}</Title>
                </div>
              }
              onClick={() =>
                history.push(`${document.location.pathname}?id=${config.id}`)
              }
              cover={
                <img alt="example" style={{ height: 200 }} src={config.logo} />
              }
            ></Card>
          </Col>
        ))}
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
