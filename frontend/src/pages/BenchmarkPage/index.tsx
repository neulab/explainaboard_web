import React, { useEffect, useState } from "react";
import "./index.css";
import { useHistory } from "react-router-dom";
import { BenchmarkTable } from "../../components";
import { BenchmarkCards } from "../../components/BenchmarkCards";
import { backendClient } from "../../clients";
import { BenchmarkConfig } from "../../clients/openapi";
import { useGoogleAnalytics } from "../../components/useGoogleAnalytics";
import useQuery from "../../components/useQuery";

export function BenchmarkPage() {
  useGoogleAnalytics();
  const history = useHistory();
  const query = useQuery();
  const id = query.get("id") || "";

  const [items, setItems] = useState<BenchmarkConfig[]>([]);

  useEffect(() => {
    async function fetchItems() {
      setItems(await backendClient.benchmarkConfigsGet(id));
    }
    fetchItems();
  }, [id, history]);

  if (id === "" || items.length !== 0) {
    return <BenchmarkCards items={items} subtitle="Select a benchmark" />;
  } else {
    return (
      <div>
        <div style={{ padding: "0 10px" }}>
          <BenchmarkTable benchmarkID={id} />
        </div>
      </div>
    );
  }
}
