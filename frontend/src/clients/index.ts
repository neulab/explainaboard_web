// Exports all client instances. We follow singleton pattern when using clients
// because it allows us to keep track of (log) all HTTP requests easily. Also,
// this pattern ensures that there is only one configuration for each client.

import { DefaultApi, Configuration, APIError } from "./openapi";

/** Client for explainaboard open APIs. We deploy frontend and backend in
 * the same containers so it's fine to redirect to the same container/instance
 * for all situations. In the future, we can use env variables to control
 * the base urls.
 */
export let backendClient = new DefaultApi(
  new Configuration({ accessToken: localStorage.getItem("_jwt") || undefined }),
  "/api"
);

/** update client to use the latest token. pass in `null` to remove the token */
export function refreshBackendClient(newJWT: string | null) {
  backendClient = new DefaultApi(
    new Configuration({ accessToken: newJWT || undefined }),
    "/api"
  );
}

/**
 * Parsed error from backend APIs
 * - caution! response stream has been read so `response.json()` will throw an
 * error. Error information in the body has been parsed and stored as attributes.
 * TODO: add error handling for 401 (prompt users to login again when token expired)
 */
export class BackendError implements APIError {
  constructor(
    public response: Response,
    public error_code: number,
    public detail: string
  ) {}
  getErrorMsg() {
    const errorCodeMsg =
      this.error_code == null || this.error_code === -1
        ? ""
        : `: ${this.error_code}`;
    return `[${this.response.status}${errorCodeMsg}] ${this.detail}`;
  }
}
/** Parse fetch error response into a `BackendError` */
export const parseBackendError = async (r: Response) => {
  const { error_code, detail } = await r.json();
  return new BackendError(r, error_code, detail);
};
