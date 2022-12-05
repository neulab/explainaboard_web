import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { AuthenticatedRoute, EnvProvider, Layout } from "./components";
import routes from "./routes";
import "antd/dist/antd.css";
import { UserProvider } from "./components";
import { Login } from "./pages";

function App() {
  return (
    <Router>
      <EnvProvider>
        <UserProvider>
          <Switch>
            <Route path="/login" exact>
              <Login />
            </Route>
            <Layout routes={routes}>
              <Switch>
                {routes.map(({ requireLogin, ...routeProps }, i) =>
                  requireLogin ? (
                    <AuthenticatedRoute {...routeProps} key={i} />
                  ) : (
                    <Route {...routeProps} key={i} />
                  )
                )}
              </Switch>
            </Layout>
          </Switch>
        </UserProvider>
      </EnvProvider>
    </Router>
  );
}

export default App;
