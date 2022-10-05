import { useEffect, useState } from "react";

export type FilterFunc<T> = (query: string, data: T[]) => T[];

export default function useSearch<T>(data: T[], filterFunc: FilterFunc<T>) {
  const [filtered, setFiltered] = useState<T[]>(data);
  const [query, setQuery] = useState<string>("");
  useEffect(() => {
    if (!query) {
      setFiltered(data);
    } else {
      setFiltered(filterFunc(query, data));
    }
  }, [query, data, filterFunc]);

  return { filtered, setQuery };
}
