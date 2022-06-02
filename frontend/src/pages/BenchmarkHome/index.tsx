import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import "./index.css";
import { Card, Col, PageHeader, Row, Typography } from "antd";
import { backendClient } from "../../clients";
import { BenchmarkConfig } from "../../clients/openapi";
import { TaskCategory } from "../../clients/openapi";

export function BenchmarkHome() {
  const history = useHistory();
  const { Title } = Typography;
  // const [benchmarkConfigs, setbenchmarkConfigs] = useState<BenchmarkConfig[]>(
    // []
  // );
  const [taskConfigs, settaskConfigs] = useState<TaskCategory[]>(
    []
  );

  useEffect(() => {
    async function fetchTasks() {
      settaskConfigs(await backendClient.tasksGet());
    }
    fetchTasks();
  }, []);


  return (
    <div className="page">
      <PageHeader
        onBack={() => history.goBack()}
        title="Benchmarks"
        subTitle="All benchmarks"
      />
      <Row gutter={[16, 16]} className="benchmarks-grid">
        {taskConfigs.map(({name, tasks}, i) => (
          tasks.map(({ name }) => (
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
              onClick={() =>
                history.push(`${document.location.pathname}?name=${name}`)
              }
              cover={<img alt="example" style={{ height: 200 }} src={"https://explainaboard.s3.amazonaws.com/benchmarks/figures/gaokao.jpg"} />}
            >
            </Card>
            </Col>
          ))
        ))}
      </Row>
    </div>
  );
}
