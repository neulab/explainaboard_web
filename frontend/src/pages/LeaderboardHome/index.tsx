import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import "./index.css";
import { Card, Col, PageHeader, Row } from "antd";
import { backendClient } from "../../clients";

export function LeaderboardHome() {
  const history = useHistory();
  const [tasks, setTasks] = useState<string[]>([]);

  useEffect(() => {
    async function fetchTasks() {
      setTasks(await backendClient.tasksGet());
    }
    fetchTasks();
  }, []);

  return (
    <div className="page">
      <PageHeader
        onBack={() => history.goBack()}
        title="Leaderboards"
        subTitle="All leaderboards"
      />
      <Row gutter={[16, 16]} className="tasks-grid">
        {tasks.map((task) => (
          <Col key={task} span={6}>
            <Card
              className="task-card"
              title={task}
              onClick={() =>
                history.push(document.location.pathname + "/" + task)
              }
            >
              {task}
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
