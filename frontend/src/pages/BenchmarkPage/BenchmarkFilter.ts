export const filterKeyMap = {
  parentId: "parent_id",
  showFeatured: "show_featured",
};

export type FilterUpdate = Partial<BenchmarkFilter>;
type QueryDict = { [key: string]: string };

export class BenchmarkFilter {
  parentId: string | undefined;
  showFeatured: boolean;

  constructor(partial: FilterUpdate) {
    Object.assign(this, partial);
    this.showFeatured =
      partial.showFeatured === undefined ? true : partial.showFeatured;
  }

  update(filterUpdate: FilterUpdate): BenchmarkFilter {
    const filterValues = { ...this, ...filterUpdate };
    return new BenchmarkFilter(filterValues);
  }

  toUrlParams(): URLSearchParams {
    const queryParams = new URLSearchParams();
    for (const [key, val] of Object.entries(
      BenchmarkFilter.parseFilterToQuery(this)
    )) {
      queryParams.append(key, val);
    }
    return queryParams;
  }

  static parseQueryToFilter(query: URLSearchParams): BenchmarkFilter {
    const filters: FilterUpdate = {};

    const parentId = query.get(filterKeyMap.parentId);
    filters.parentId = parentId || "";

    const showFeatured = query.get(filterKeyMap.showFeatured);
    if (filters.parentId === "") {
      filters.showFeatured = showFeatured === "false" ? false : true;
    } else {
      // featured benchmarks are only available at
      // the root page, so we set the filter to false here
      filters.showFeatured = false;
    }

    return new BenchmarkFilter(filters);
  }

  static parseFilterToQuery(filter: Partial<BenchmarkFilter>): QueryDict {
    const dict: QueryDict = {};

    dict[filterKeyMap.parentId] = filter.parentId || "";
    dict[filterKeyMap.showFeatured] = filter.showFeatured ? "true" : "false";

    return dict;
  }
}
