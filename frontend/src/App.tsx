import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { Layout } from "./components";
import routes from "./routes";
import "antd/dist/antd.css";
import { LeaderboardPage } from "./pages";

function App() {
  return (
    <Router>
      <Layout routes={routes}>
        <Switch>
          {routes.map((route, i) => (
            <Route {...route} key={i} />
          ))}
          <Route path="/leaderboards/:task" exact>
            <LeaderboardPage />
          </Route>
        </Switch>
      </Layout>
    </Router>
  );
}

export default App;
