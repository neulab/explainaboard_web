// Exports all client instances. We follow singleton pattern when using clients
// because it allows us to keep track of (log) all HTTP requests easily. Also,
// this pattern ensures that there is only one configuration for each client.

import { DefaultApi, Configuration } from "./openapi";

export const backendClient = new DefaultApi(new Configuration({}), "/api");
