import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { Layout } from "./components";
import routes from "./routes";
import "antd/dist/antd.css";

function App() {
  return (
    <Router>
      <Layout routes={routes}>
        <Switch>
          {routes.map((route, i) => (
            <Route {...route} key={i} />
          ))}
        </Switch>
      </Layout>
    </Router>
  );
}

export default App;
