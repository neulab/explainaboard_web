import React, { useEffect, useState } from "react";
import "./index.css";
import { PageHeader } from "antd";
import { useHistory, useLocation } from "react-router-dom";
import { BenchmarkTable } from "../../components";
import { BenchmarkCards } from "../../components/BenchmarkCards";
import { backendClient } from "../../clients";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

async function getTasks() {
  const allTasks = Array<string>();
  const taskConfigs = await backendClient.tasksGet();
  taskConfigs.map(({tasks}, i) => (
    tasks.map(({ name }) => 
    allTasks.push(name))
  ))
  return allTasks;
}

async function getBenchmarks() {
  const allBenchmarks = Array<string>();
  const benchmarkConfigs = await backendClient.benchmarkconfigsGet();
  benchmarkConfigs.map(({name}) => 
  allBenchmarks.push(name)
  )
  return allBenchmarks;
}

export function BenchmarkPage() {
  const history = useHistory();
  const query = useQuery();
  const name = query.get("name") || undefined;

  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    async function fetchItems() {
      if (name === "Global") {
        setItems(await getTasks())
      }
      else if (name == null) {
        setItems(await getBenchmarks())
      }
    }
    fetchItems();
  }, [name, history]);

  if (name === "Global" || name == null) {
    return <BenchmarkCards items={ items } subtitle="Select a benchmark"/>;
  }
  else {
    let title = "";
    title = name;
    let subTitle = "";
    subTitle = `${name}`;

    return (
      <div>
        <PageHeader
          onBack={() => history.goBack()}
          title={title + " Benchmark"}
          subTitle={`Benchmark for ${subTitle}`}
        />
        <div style={{ padding: "0 10px" }}>
          <BenchmarkTable benchmarkID={name} />
        </div>
      </div>
    );
  } 
}
