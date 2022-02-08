import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { AuthenticatedRoute, EnvProvider, Layout } from "./components";
import routes from "./routes";
import "antd/dist/antd.css";
import { UserProvider } from "./components";

function App() {
  return (
    <Router>
      <EnvProvider>
        <UserProvider>
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
        </UserProvider>
      </EnvProvider>
    </Router>
  );
}

export default App;
