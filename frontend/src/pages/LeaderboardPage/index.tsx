import React from "react";
import "./index.css";
import { PageHeader } from "antd";
import { useHistory, useLocation } from "react-router-dom";
import { SystemsTable } from "../../components";
import { LeaderboardHome } from "../LeaderboardHome";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

/**
 * TODO:
 * 1. handle task name not valid
 */
export function LeaderboardPage() {
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
        <PageHeader
          onBack={() => history.goBack()}
          title={title + " Leaderboard"}
          subTitle={`Leaderboard for ${subTitle}`}
        />
        <div style={{ padding: "0 10px" }}>
          <SystemsTable
            initialTaskFilter={task}
            dataset={dataset}
            subdataset={subdataset}
          />
        </div>
      </div>
    );
  } else {
    return <LeaderboardHome />;
  }
}
