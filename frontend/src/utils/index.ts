import { TaskCategory } from "../clients/openapi";

export enum PageState {
  loading,
  success,
  error,
}

/**
 * Reads a file and returns base64 encoded file
 * @param file
 * @returns
 */
export const toBase64 = (file: File) =>
  new Promise<string | ArrayBuffer | null>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

/** find the selected task in task info and return supported metrics */
export function findTask(taskCategories: TaskCategory[], taskName: string) {
  if (taskName != null) {
    for (const category of taskCategories) {
      const task = category.tasks.find(({ name }) => name === taskName);
      if (task) return task;
    }
  }
  return undefined;
}

/**generates datalab URL for a dataset. Simple concatenation (link may not be valid) */
export function generateDataLabURL(datasetName: string): string {
  return `https://github.com/ExpressAI/DataLab/blob/main/datasets/${datasetName}/${datasetName}.py`;
}

export function generateLeaderboardURL(
  dataset: string,
  subdataset: string | undefined,
  split: string | undefined
): string {
  let url = `/leaderboards?dataset=${dataset}`;
  if (subdataset !== undefined) {
    url = `${url}&subdataset=${subdataset}`;
  }
  if (split !== undefined) {
    url = `${url}&split=${split}`;
  }
  return url;
}

export function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export * from "./typing_utils";
