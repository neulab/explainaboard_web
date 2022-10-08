import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { backendClient, refreshBackendClient } from "../clients";
import { useEnv } from ".";
import { useHistory } from "react-router-dom";
import { UserMetadata } from "../clients/openapi";

export enum LoginState {
  yes = "yes",
  no = "no",
  expired = "expired",
  loading = "loading",
}
interface IUserContext {
  userInfo?: UserMetadata;
  jwt: string | null;
  login: () => void;
  logout: () => void;
  state: LoginState;
  /** update jwt and redirect to the previous page when login is successful (should only be used by callback page) */
  loginCallback: (jwt: string) => void;
}
const UserContext = createContext<IUserContext>({} as IUserContext);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { env, authURL } = useEnv();
  const history = useHistory();
  const jwtKey = `explainaboard_${env}_jwt`;
  const redirectPageKey = `explainaboard_${env}_redirect`;

  const [jwt, setJwt] = useState(initJWT());
  const [state, setState] = useState(LoginState.loading);
  const [userInfo, setUserInfo] = useState<UserMetadata>();

  function initJWT() {
    const savedToken = localStorage.getItem(jwtKey);
    refreshBackendClient(savedToken);
    return savedToken;
  }

  useEffect(() => {
    async function fetchUserInfo() {
      try {
        setState(LoginState.loading);
        const _userInfo = await backendClient.userGet();
        setUserInfo(_userInfo);
        setState(LoginState.yes);
      } catch (e) {
        setState(LoginState.expired);
        refreshBackendClient(null);
      }
    }
    if (jwt) fetchUserInfo();
    else {
      setUserInfo(undefined);
      setState(LoginState.no);
    }
  }, [jwt]);

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
    localStorage.setItem(
      redirectPageKey,
      window.location.pathname + window.location.search
    );
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
