import { useEffect, useState } from "react";

export type FilterFunc<T> = (query: string, data: T[]) => T[];

/**
 *
 * @param data a list of data to search from
 * @param filterFunc a function used to search for data
 * @returns filtered data and a function to set the query
 */
export default function useSearch<T>(
  data: T[],
  filterFunc: FilterFunc<T>
): {
  filtered: T[];
  setQuery: (newQuery: string) => void;
} {
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
