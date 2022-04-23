import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import "./index.css";
import { Collapse, Card, Col, PageHeader, Row, Space, Typography } from "antd";
import { backendClient } from "../../clients";
import { TaskCategory } from "../../clients/openapi";

export function LeaderboardHome() {
  const history = useHistory();
  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);

  useEffect(() => {
    async function fetchTasks() {
      setTaskCategories(await backendClient.tasksGet());
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
      <Collapse>
        {taskCategories.map(({ name, tasks, description }) => (
          <Collapse.Panel
            key={name}
            header={
              <TaskCategoryHeader title={name} description={description} />
            }
          >
            <Row gutter={[16, 16]} className="tasks-grid">
              {tasks.map(({ name }) => (
                <Col key={name} span={6}>
                  <Card
                    className="task-card"
                    title={name}
                    onClick={() =>
                      history.push(`${document.location.pathname}?task=${name}`)
                    }
                  >
                    {name}
                  </Card>
                </Col>
              ))}
            </Row>
          </Collapse.Panel>
        ))}
      </Collapse>
    </div>
  );
}

interface TaskCategoryHeaderProps {
  title: string;
  description: string;
}
function TaskCategoryHeader({ title, description }: TaskCategoryHeaderProps) {
  return (
    <Space>
      <Typography.Title level={5} style={{ marginBottom: 0 }}>
        {title}
      </Typography.Title>
      <span style={{ color: "gray" }}>{description}</span>
    </Space>
  );
}
