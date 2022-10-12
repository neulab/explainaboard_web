import React from "react";
import "./index.css";
import { PageHeader } from "antd";
import { useHistory } from "react-router-dom";
import { SystemsTable } from "../../components";
import { LeaderboardHome } from "../LeaderboardHome";
import { useGoogleAnalytics } from "../../components/useGoogleAnalytics";
import { Helmet } from "react-helmet";
import useQuery from "../../components/useQuery";

/**
 * TODO:
 * 1. handle task name not valid
 */
export function LeaderboardPage() {
  useGoogleAnalytics();
  const history = useHistory();
  const query = useQuery();
  const task = query.get("task") || undefined;
  const dataset = query.get("dataset") || undefined;
  const subdataset = query.get("subdataset") || undefined;

  if (task || dataset || subdataset) {
    let title = "";
    if (dataset) {
      title = dataset;
      if (subdataset) title += ` (${subdataset})`;
    } else if (task) {
      title = task;
    }
    let subTitle;
    if (subdataset) {
      subTitle = `subdataset: ${subdataset}`;
    } else if (dataset) {
      subTitle = `dataset: ${dataset}`;
    } else {
      subTitle = `task: ${task}`;
    }
    return (
      <div>
        <Helmet>
          <title>ExplainaBoard - {title} Leaderboard</title>
        </Helmet>
        <PageHeader
          onBack={() => history.goBack()}
          title={title + " Leaderboard"}
          subTitle={`Leaderboard for ${subTitle}`}
        />
        <div style={{ padding: "0 10px" }}>
          <SystemsTable />
        </div>
      </div>
    );
  } else {
    return <LeaderboardHome />;
  }
}
