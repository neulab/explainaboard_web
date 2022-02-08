import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { AuthenticatedRoute, Layout } from "./components";
import routes from "./routes";
import "antd/dist/antd.css";
import { UserProvider } from "./utils/useUser";

function App() {
  return (
    <Router>
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
    </Router>
  );
}

export default App;
