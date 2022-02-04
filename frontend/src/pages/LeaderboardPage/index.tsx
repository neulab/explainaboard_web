import React from "react";
import "./index.css";
import { PageHeader } from "antd";
import { useHistory, useParams } from "react-router-dom";
import { SystemsTable } from "../../components";

/**
 * TODO:
 * 1. handle task name not valid
 */
export function LeaderboardPage() {
  const history = useHistory();
  const { task } = useParams<{ task: string }>();

  return (
    <div>
      <PageHeader
        onBack={() => history.goBack()}
        title={task + " Leaderboard"}
        subTitle={`Leaderboard for ${task}`}
      />
      <div style={{ padding: "0 10px" }}>
        <SystemsTable initialTaskFilter={task} />
      </div>
    </div>
  );
}
