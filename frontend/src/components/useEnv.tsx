import { Result, Spin } from "antd";
import React, { createContext, useContext, useEffect, useState } from "react";
import { PageState } from "../utils";
import { backendClient } from "../clients";

interface IEnvContext {
  env: string;
  firebaseAPIKey: string;
}

const EnvContext = createContext<IEnvContext>({} as IEnvContext);
/** Provide environment context like color scheme, env identifier, auth_url */
export function EnvProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<IEnvContext>();
  const [state, setState] = useState(PageState.loading);
  useEffect(() => {
    backendClient
      .infoGet()
      .then(({ env, firebase_api_key }) => {
        setValue({ env, firebaseAPIKey: firebase_api_key });
      })
      .catch((e) => setState(PageState.error));
  }, []);
  if (state === PageState.error)
    return (
      <Result
        status="500"
        title="Internal Error: Server Down"
        style={{ marginTop: "10%" }}
      />
    );
  if (value == null)
    return (
      <Spin
        size="large"
        style={{ width: "100vw", marginTop: "40vh" }}
        tip="Loading ExplainaBoard..."
      />
    );
  return <EnvContext.Provider value={value}>{children}</EnvContext.Provider>;
}

/** use EnvContext to get/set color schema, env identifier, auth_url etc. */
export function useEnv() {
  return useContext(EnvContext);
}
