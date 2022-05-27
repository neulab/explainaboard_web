import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import "./index.css";
import { Card, Col, PageHeader, Row, Typography } from "antd";
import { backendClient } from "../../clients";
import { BenchmarkConfig } from "../../clients/openapi";

export function BenchmarkHome() {
  const history = useHistory();
  const { Title } = Typography;
  const [benchmarkConfigs, setbenchmarkConfigs] = useState<BenchmarkConfig[]>(
    []
  );

  useEffect(() => {
    async function fetchBenchmarks() {
      setbenchmarkConfigs(await backendClient.benchmarkconfigsGet());
    }
    fetchBenchmarks();
  }, []);

  return (
    <div className="page">
      <PageHeader
        onBack={() => history.goBack()}
        title="Benchmarks"
        subTitle="All benchmarks"
      />
      <Row gutter={[16, 16]} className="benchmarks-grid">
        {benchmarkConfigs.map(({ name, logo }) => (
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
              cover={<img alt="example" style={{ height: 200 }} src={logo} />}
            >
              {/* {name} */}
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
