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
