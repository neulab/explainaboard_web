import React, { useEffect, useState } from "react";
import "./index.css";
import { useHistory, useLocation } from "react-router-dom";
import { BenchmarkTable } from "../../components";
import { BenchmarkCards } from "../../components/BenchmarkCards";
import { backendClient } from "../../clients";
import { BenchmarkConfig } from "../../clients/openapi";
import { useGoogleAnalytics } from "../../components/useGoogleAnalytics";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

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
