import React, { useEffect, useState } from "react";
import "./index.css";
import { useHistory } from "react-router-dom";
import { BenchmarkTable } from "../../components";
import { BenchmarkCards } from "../../components/BenchmarkCards";
import { backendClient } from "../../clients";
import { BenchmarkConfig } from "../../clients/openapi";
import { useGoogleAnalytics } from "../../components/useGoogleAnalytics";
import useQuery from "../../components/useQuery";
import { BenchmarkFilter, FilterUpdate } from "./BenchmarkFilter";

export function BenchmarkPage() {
  useGoogleAnalytics();
  const history = useHistory();
  const query = useQuery();

  const [items, setItems] = useState<BenchmarkConfig[]>([]);
  const [filters, setFilters] = useState<BenchmarkFilter>(
    BenchmarkFilter.parseQueryToFilter(query)
  );

  const id = filters.parentId || "";
  const isAtRootPage = id === "";

  const onFilterChange = function (updates: FilterUpdate) {
    setFilters(filters.update(updates));
  };

  useEffect(() => {
    async function fetchItems() {
      setItems(
        await backendClient.benchmarkConfigsGet(id, filters.showFeatured)
      );
    }
    const prevString = query.toString();
    const newString = filters.toUrlParams().toString();
    if (prevString !== newString) {
      history.replace({ search: filters.toUrlParams().toString() });
    }

    fetchItems();
  }, [history, filters, query, id]);

  if (isAtRootPage || items.length !== 0) {
    return (
      <BenchmarkCards
        items={items}
        isAtRootPage={isAtRootPage}
        showFeatured={filters.showFeatured}
        onFilterChange={onFilterChange}
      />
    );
  } else {
    return (
      <div>
        <div style={{ padding: "0 10px" }}>
          <BenchmarkTable benchmarkID={id} onFilterChange={onFilterChange} />
        </div>
      </div>
    );
  }
}
