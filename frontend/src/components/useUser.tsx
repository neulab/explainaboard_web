import React, { createContext, useCallback, useContext, useState } from "react";
import jwtDecode from "jwt-decode";
import moment from "moment";
import { refreshBackendClient } from "../clients";
import { useEnv } from ".";
import { useHistory } from "react-router-dom";

export enum LoginState {
  yes = "yes",
  no = "no",
  expired = "expired",
  loading = "loading",
}
interface IUserContext {
  userInfo: JWTInfo | null;
  jwt: string | null;
  login: () => void;
  logout: () => void;
  state: LoginState;
  /** update jwt and redirect to the previous page when login is successful (should only be used by callback page) */
  loginCallback: (jwt: string) => void;
}
const UserContext = createContext<IUserContext>({} as IUserContext);
interface JWTInfo {
  auth_time: number;
  cognitousername: string;
  email: string;
  email_verified: boolean;
  exp: number;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { env, authURL } = useEnv();
  const history = useHistory();
  const jwtKey = `explainaboard_${env}_jwt`;
  const redirectPageKey = `explainaboard_${env}_redirect`;

  const [jwt, setJwt] = useState(initJWT());

  function initJWT() {
    const savedToken = localStorage.getItem(jwtKey);
    refreshBackendClient(savedToken);
    return savedToken;
  }

  let userInfo: JWTInfo | null = null;
  let state = LoginState.no;

  if (jwt) {
    userInfo = jwtDecode<JWTInfo>(jwt);
    if (moment().unix() > userInfo.exp) {
      // expired
      state = LoginState.expired;
    } else state = LoginState.yes;
  } else state = LoginState.no;

  /** callback when login success */
  const loginCallback = useCallback(
    (newJwt: string) => {
      setJwt(newJwt);
      localStorage.setItem(jwtKey, newJwt);
      refreshBackendClient(newJwt);
      history.push(localStorage.getItem(redirectPageKey) || "/");
    },
    [history, jwtKey, redirectPageKey]
  );

  /** TODO: revoke token */
  const logout = useCallback(() => {
    localStorage.removeItem(jwtKey);
    setJwt(null);
    refreshBackendClient(null);
  }, [jwtKey]);

  /** redirect to login page */
  const login = useCallback(() => {
    localStorage.setItem(redirectPageKey, window.location.pathname);
    const { protocol, host } = window.location;
    window.location.href = encodeURI(
      `${authURL}${protocol}//${host}/login-callback`
    );
  }, [authURL, redirectPageKey]);

  return (
    <UserContext.Provider
      value={{ state, userInfo, login, jwt, logout, loginCallback }}
    >
      {children}
    </UserContext.Provider>
  );
}

/** use UserContext to get user info, login, logout, etc. */
export function useUser() {
  return useContext(UserContext);
}
