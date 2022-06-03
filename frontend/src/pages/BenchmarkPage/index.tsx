import React from "react";
import "./index.css";
import { useLocation } from "react-router-dom";
import { BenchmarkTable } from "../../components";
import { BenchmarkHome } from "../BenchmarkHome";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export function BenchmarkPage() {
  const query = useQuery();
  const id = query.get("id") || undefined;

  if (id) {
    return <BenchmarkTable benchmarkID={id} />;
  } else {
    return <BenchmarkHome />;
  }
}
