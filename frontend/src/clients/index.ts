// Exports all client instances. We follow singleton pattern when using clients
// because it allows us to keep track of (log) all HTTP requests easily. Also,
// this pattern ensures that there is only one configuration for each client.

import { DefaultApi, APIError, FetchAPI } from "./openapi";
import * as isomorphicFetch from "isomorphic-fetch";
import { getAuth } from "firebase/auth";

/** A wrapper for fetch that adds a Bearer token to the header if the currentUser is
 * signed in.
 * - overrides the Authorization header if it is provided
 * - automatically refreshes the token if it is expired
 *  */
const fetchWithBearer: FetchAPI = async (url, init) => {
  const authApp = getAuth();
  if (!authApp || !authApp.currentUser) return await isomorphicFetch(url, init);

  const jwt = await authApp.currentUser.getIdToken();
  init.headers["Authorization"] = "Bearer " + jwt;
  return await isomorphicFetch(url, init);
};

/** Client for explainaboard open APIs. We deploy frontend and backend in
 * the same containers so it's fine to redirect to the same container/instance
 * for all situations. In the future, we can use env variables to control
 * the base urls.
 */
export let backendClient = new DefaultApi(undefined, "/api", isomorphicFetch);

/** update client to use fetchWithBearer when user is signed in */
export function refreshBackendClient(isUserSignedIn: boolean) {
  if (isUserSignedIn) {
    backendClient = new DefaultApi(undefined, "/api", fetchWithBearer);
  } else {
    backendClient = new DefaultApi(undefined, "/api", isomorphicFetch);
  }
}

/**
 * Parsed error from backend APIs
 * - caution! response stream has been read so `response.json()` will throw an
 * error. Error information in the body has been parsed and stored as attributes.
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
