const filterDelim = "..";
export const filterKeyMap = {
  nameFilter: "name",
  taskFilter: "task",
  showMine: "show_mine",
  sortField: "sort_field",
  sortDir: "sort_dir",
  dataset: "dataset",
  datasetSplit: "dataset_split",
  subdataset: "sub_dataset",
  activeSystemIDs: "system_id",
};

export type FilterUpdate = Partial<SystemFilter>;
type QueryDict = { [key: string]: string };

export class SystemFilter {
  name: string | undefined;
  task: string | undefined;
  showMine: boolean;
  sortField: string | undefined;
  sortDir: "asc" | "desc";
  dataset: string | undefined;
  split: string | undefined;
  subdataset: string | undefined;
  activeSystemIDs: Array<string> | undefined;

  constructor(partial: FilterUpdate) {
    Object.assign(this, partial);
    this.showMine = partial.showMine === undefined ? false : partial.showMine;
    this.sortField = partial.sortField || "created_at";
    this.sortDir = partial.sortDir || "desc";
  }

  /* Update the filter with the values in the new partial filter */

  update(filterUpdate: FilterUpdate): SystemFilter {
    const filterValues = { ...this, ...filterUpdate };
    return new SystemFilter(filterValues);
  }

  /* Parse current instance to url parameters */
  toUrlParams(): URLSearchParams {
    const queryParams = new URLSearchParams();
    for (const [key, val] of Object.entries(
      SystemFilter.parseFilterToQuery(this)
    )) {
      queryParams.append(key, val);
    }
    return queryParams;
  }

  static parseQueryToFilter(query: URLSearchParams): SystemFilter {
    const filters: FilterUpdate = {};

    const name = query.get(filterKeyMap.nameFilter);
    filters.name = name === null ? undefined : name;

    const task = query.get(filterKeyMap.taskFilter);
    filters.task = task === null ? undefined : task;

    const showMine = query.get(filterKeyMap.showMine);
    filters.showMine = showMine === "true" ? true : false;

    const sortDir = query.get(filterKeyMap.sortDir);
    filters.sortDir = sortDir === "asc" ? "asc" : "desc";

    const sortField = query.get(filterKeyMap.sortField);
    filters.sortField = sortField === null ? undefined : sortField;

    const split = query.get(filterKeyMap.datasetSplit);
    filters.split = split === null ? undefined : split;

    const activeSystemIDs = query.get(filterKeyMap.activeSystemIDs);
    filters.activeSystemIDs =
      activeSystemIDs === null ? undefined : activeSystemIDs.split(filterDelim);

    const dataset = query.get(filterKeyMap.dataset);
    filters.dataset = dataset === null ? undefined : dataset;

    const subdataset = query.get(filterKeyMap.subdataset);
    filters.subdataset = subdataset === null ? undefined : subdataset;

    return new SystemFilter(filters);
  }

  static parseFilterToQuery(filter: Partial<SystemFilter>): QueryDict {
    const dict: QueryDict = {};

    if (filter.name) dict[filterKeyMap.nameFilter] = filter.name;
    if (filter.task) dict[filterKeyMap.taskFilter] = filter.task;
    dict[filterKeyMap.showMine] = filter.showMine ? "true" : "false";
    dict[filterKeyMap.sortDir] = filter.sortDir === "asc" ? "asc" : "desc";
    dict[filterKeyMap.sortField] = filter.sortField || "created_at";
    if (filter.split) dict[filterKeyMap.datasetSplit] = filter.split;
    if (filter.activeSystemIDs && filter.activeSystemIDs.length > 0)
      dict[filterKeyMap.activeSystemIDs] =
        filter.activeSystemIDs.join(filterDelim);
    if (filter.dataset) dict[filterKeyMap.dataset] = filter.dataset;
    if (filter.subdataset) dict[filterKeyMap.subdataset] = filter.subdataset;

    return dict;
  }
}
