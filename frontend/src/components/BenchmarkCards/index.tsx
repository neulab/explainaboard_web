import React from "react";
import { useHistory } from "react-router-dom";
import "./index.css";
import { Card, Col, PageHeader, Row, Typography } from "antd";
import { BenchmarkConfig } from "../../clients/openapi";
import { Helmet } from "react-helmet";

interface Props {
  items: Array<BenchmarkConfig>;
  subtitle: string;
}

export function BenchmarkCards({ items, subtitle }: Props) {
  const history = useHistory();
  const { Title } = Typography;

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
      <Row gutter={[16, 16]} className="benchmarks-grid">
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
              // title= {< div style= {{textAlign: "center"}} > Card title </div >}

              onClick={() =>
                history.push(`${document.location.pathname}?id=${config.id}`)
              }
              cover={
                <img alt="example" style={{ height: 200 }} src={config.logo} />
              }
            >
              {/* {name} */}
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
