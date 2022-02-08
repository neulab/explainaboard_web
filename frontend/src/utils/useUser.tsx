import React, { createContext, useCallback, useContext, useState } from "react";
import { useLocation } from "react-router-dom";
import jwtDecode from "jwt-decode";
import moment from "moment";
import { refreshBackendClient } from "../clients";

export enum LoginState {
  yes = "yes",
  no = "no",
  expired = "expired",
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
  const [jwt, setJwt] = useState(loadJWT());
  const location = useLocation();

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
        saveJWT(newJWT);
        refreshBackendClient(newJWT);
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
    localStorage.removeItem("_jwt");
    setJwt(null);
    refreshBackendClient(null);
  }, []);

  return (
    <UserContext.Provider value={{ state, userInfo, login, jwt, logout }}>
      {children}
    </UserContext.Provider>
  );
}

const loadJWT = () => {
  return localStorage.getItem("_jwt");
};

function saveJWT(jwt: string) {
  localStorage.setItem("_jwt", jwt);
}

export function useUser() {
  return useContext(UserContext);
}

/**TODO distinguish env */
const login = () => {
  window.location.href = encodeURI(
    `https://explainaboard-dev.auth.us-east-1.amazoncognito.com/oauth2/authorize?client_id=321jpah4jmcdqha7gb9pf9vnqv&response_type=token&scope=email+openid+phone&redirect_uri=${
      window.location.protocol +
      "//" +
      window.location.host +
      window.location.pathname
    }`
  );
};
