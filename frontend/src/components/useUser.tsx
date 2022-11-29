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
import { User } from "../clients/openapi";
import { Auth, getAuth, signOut } from "firebase/auth";
import { initializeApp } from "firebase/app";

export enum LoginState {
  yes = "yes",
  no = "no",
  loading = "loading",
}
interface IUserContext {
  userInfo?: User;
  state: LoginState;
  login: () => void;
  logout: () => void;
  /** redirect to the previous page when login is successful (should only be
   *  used by the callback page) */
  loginCallback: () => void;
}
const UserContext = createContext<IUserContext>({} as IUserContext);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const history = useHistory();
  const { env, firebaseAPIKey } = useEnv();
  const redirectPageKey = `explainaboard_${env}_redirect`;
  const [authApp, setAuthApp] = useState<Auth>();
  const [state, setState] = useState(LoginState.loading);
  const [userInfo, setUserInfo] = useState<User>();

  useEffect(() => {
    // create authApp only once
    if (!authApp) {
      const authApp = getAuth(initializeApp({ apiKey: firebaseAPIKey }));
      setAuthApp(authApp);
      authApp.onAuthStateChanged(async (user) => {
        if (user) {
          try {
            /** When a user signs up with email+password, a display name is collected by
             * firebaseui but this display name is not registered to firebase on create.
             * firebaseui solves this by creating the user account first and then updating
             * the account to include the display name. The token, however, is generated
             * on create so display name is missing from that initial token. Our backend
             * requires the display name information so we force refresh token here. There
             * is no way to distinguish a new user from an existing one at this point so
             * the best we can do is to refresh for all users.
             */
            await user.getIdToken(true);
            refreshBackendClient(true);
            setUserInfo(await backendClient.userGet());
            setState(LoginState.yes);
          } catch (e) {
            console.error(e);
            refreshBackendClient(false);
            setState(LoginState.no);
          }
        } else {
          refreshBackendClient(false);
          setState(LoginState.no);
        }
      });
    }
  }, [authApp, firebaseAPIKey]);

  /** callback when login success */
  const loginCallback = useCallback(() => {
    const redirectPage = localStorage.getItem(redirectPageKey) || "/";
    localStorage.removeItem(redirectPageKey);
    history.push(redirectPage);
  }, [history, redirectPageKey]);

  const logout = useCallback(() => {
    if (authApp) {
      signOut(authApp);
    }
  }, [authApp]);

  /** redirect to login page */
  const login = useCallback(() => {
    localStorage.setItem(
      redirectPageKey,
      window.location.pathname + window.location.search
    );
    history.push("/login");
  }, [redirectPageKey, history]);

  return (
    <UserContext.Provider
      value={{ state, userInfo, login, logout, loginCallback }}
    >
      {children}
    </UserContext.Provider>
  );
}

/** use UserContext to get user info, login, logout, etc. */
export function useUser() {
  return useContext(UserContext);
}
