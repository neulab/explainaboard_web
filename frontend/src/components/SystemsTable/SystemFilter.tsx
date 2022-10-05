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
export type QueryDict = { [key: string]: string };

export class SystemFilter {
  name: string;
  task: string;
  showMine: boolean;
  sortField: string;
  sortDir: "asc" | "desc";
  dataset: string;
  split: string;
  subdataset: string;
  activeSystemIDs: Array<string>;

  constructor(partial: Partial<FilterUpdate> | null) {
    if (!partial) {
      this.name = "";
      this.task = "";
      this.showMine = false;
      this.sortField = "created_at";
      this.sortDir = "desc";
      this.dataset = "";
      this.split = "";
      this.subdataset = "";
      this.activeSystemIDs = [];
      return;
    }

    const defaultFilter = SystemFilter.getDefaultFilter();
    this.name = partial.name || defaultFilter.name;
    this.task = partial.task || defaultFilter.task;
    this.showMine =
      partial.showMine === undefined
        ? defaultFilter.showMine
        : partial.showMine;
    this.sortField = partial.sortField || defaultFilter.sortField;
    this.sortDir = partial.sortDir || defaultFilter.sortDir;
    this.dataset = partial.dataset || defaultFilter.dataset;
    this.split = partial.split || defaultFilter.split;
    this.subdataset = partial.subdataset || defaultFilter.subdataset;
    this.activeSystemIDs =
      partial.activeSystemIDs || defaultFilter.activeSystemIDs;
  }

  /*  Update the filter with the values in the new partial filter 
      Returns true if >= 1 of current filter values get updated

      TODO: Rolling out all if statement seems necessary because Typescript
      won't allow variable field access for classes. Is there a bette way tho?
  */
  update(partial: FilterUpdate): boolean {
    let updated = false;

    if ((partial.name && this.name !== partial.name) || partial.name === "") {
      updated = true;
      this.name = partial.name;
    }

    if ((partial.task && this.task !== partial.task) || partial.task === "") {
      updated = true;
      this.task = partial.task;
    }

    if (partial.showMine !== undefined && this.showMine !== partial.showMine) {
      updated = true;
      this.showMine = partial.showMine;
    }

    if (partial.sortField && this.sortField !== partial.sortField) {
      updated = true;
      this.sortField = partial.sortField;
    }

    if (partial.sortDir && this.sortDir !== partial.sortDir) {
      updated = true;
      this.sortDir = partial.sortDir;
    }

    if (partial.dataset && this.dataset !== partial.dataset) {
      updated = true;
      this.dataset = partial.dataset;
    }

    if (partial.split && this.split !== partial.split) {
      updated = true;
      this.split = partial.split;
    }

    if (partial.subdataset && this.subdataset !== partial.subdataset) {
      updated = true;
      this.subdataset = partial.subdataset;
    }

    if (
      partial.activeSystemIDs &&
      JSON.stringify(this.activeSystemIDs.sort()) !==
        JSON.stringify(partial.activeSystemIDs.sort())
    ) {
      updated = true;
      this.activeSystemIDs = partial.activeSystemIDs;
    }

    return updated;
  }

  toUrlParams(): URLSearchParams {
    const queryParams = new URLSearchParams();
    for (const [key, val] of Object.entries(
      SystemFilter.parseFilterToQuery(this)
    )) {
      queryParams.append(key, val);
    }
    return queryParams;
  }

  static getDefaultFilter(): SystemFilter {
    return new SystemFilter(null);
  }

  static parseQueryToFilter(query: URLSearchParams): SystemFilter {
    const defaultFilter = SystemFilter.getDefaultFilter();

    const activeSystemIDs = query.get(filterKeyMap.activeSystemIDs);
    let activeSystemIDArray: string[];
    if (activeSystemIDs) {
      activeSystemIDArray = activeSystemIDs.split(filterDelim);
    } else {
      activeSystemIDArray = [];
    }

    return new SystemFilter({
      name: query.get(filterKeyMap.nameFilter) || defaultFilter.name,
      task: query.get(filterKeyMap.taskFilter) || defaultFilter.task,
      showMine:
        query.get(filterKeyMap.showMine) === "true"
          ? true
          : defaultFilter.showMine,
      sortDir:
        query.get(filterKeyMap.sortDir) === "asc"
          ? "asc"
          : defaultFilter.sortDir,
      sortField: query.get(filterKeyMap.sortField) || defaultFilter.sortField,
      split: query.get(filterKeyMap.datasetSplit) || defaultFilter.split,
      activeSystemIDs: activeSystemIDArray || defaultFilter.activeSystemIDs,
      dataset: query.get(filterKeyMap.dataset) || defaultFilter.dataset,
      subdataset:
        query.get(filterKeyMap.subdataset) || defaultFilter.subdataset,
    });
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
