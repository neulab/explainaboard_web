import React from "react";
import { useHistory } from "react-router-dom";
import "./index.css";
import { Card, Col, PageHeader, Row, Typography } from "antd";

interface Props {
  items: Array<string>;
  subtitle: string;
}

export function BenchmarkCards({ items, subtitle }: Props) {
  const history = useHistory();
  const { Title } = Typography;

  return (
    <div className="page">
      <PageHeader
        onBack={() => history.goBack()}
        title="Benchmarks"
        subTitle={subtitle}
      />
      <Row gutter={[16, 16]} className="benchmarks-grid">
        {items.map((name) => (
          <Col key={name} span={6}>
            <Card
              hoverable
              style={{
                width: 240,
              }}
              className="benchmark-card"
              title={
                <div style={{ textAlign: "center" }}>
                  <Title level={3}>{name}</Title>
                </div>
              }
              // title= {< div style= {{textAlign: "center"}} > Card title </div >}

              onClick={() =>
                history.push(`${document.location.pathname}?name=${name}`)
              }
              cover={
                <img
                  alt="example"
                  style={{ height: 200 }}
                  src={
                    "https://explainaboard.s3.amazonaws.com/benchmarks/figures/gaokao.jpg"
                  }
                />
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
