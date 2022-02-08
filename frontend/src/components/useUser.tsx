import React, { createContext, useCallback, useContext, useState } from "react";
import { useLocation } from "react-router-dom";
import jwtDecode from "jwt-decode";
import moment from "moment";
import { refreshBackendClient } from "../clients";
import { useEnv } from ".";

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
  const jwtKey = `explainaboard_${env}_jwt`;

  const [jwt, setJwt] = useState(initJWT());
  const location = useLocation();

  function initJWT() {
    const savedToken = localStorage.getItem(jwtKey);
    refreshBackendClient(savedToken);
    return savedToken;
  }

  /** if path has jwt token, parse and save to localstorage */
  function parseJWTWhenRedirect() {
    const hash = location.hash;
    if (hash.length > 0) {
      const segments = hash.substring(1).split("&");
      const jwtSegment = segments.find((segment) =>
        segment.startsWith("id_token=")
      );
      if (jwtSegment) {
        const newJWT = jwtSegment.substring("id_token=".length);
        window.location.href = location.pathname; // remove jwt token from url
        setJwt(newJWT);
        localStorage.setItem(jwtKey, newJWT);
      }
    }
  }
  parseJWTWhenRedirect();

  let userInfo: JWTInfo | null = null;
  let state = LoginState.no;

  if (jwt) {
    userInfo = jwtDecode<JWTInfo>(jwt);
    if (moment().unix() > userInfo.exp) {
      // expired
      state = LoginState.expired;
    } else state = LoginState.yes;
  } else state = LoginState.no;

  /** TODO: revoke token */
  const logout = useCallback(() => {
    localStorage.removeItem(jwtKey);
    setJwt(null);
    refreshBackendClient(null);
  }, [jwtKey]);

  /** redirect to login page */
  const login = useCallback(() => {
    const redirectURL = `${authURL}&redirect_uri=${
      window.location.protocol +
      "//" +
      window.location.host +
      window.location.pathname
    }`;
    window.location.href = encodeURI(redirectURL);
  }, [authURL]);

  return (
    <UserContext.Provider value={{ state, userInfo, login, jwt, logout }}>
      {children}
    </UserContext.Provider>
  );
}

/** use UserContext to get user info, login, logout, etc. */
export function useUser() {
  return useContext(UserContext);
}
