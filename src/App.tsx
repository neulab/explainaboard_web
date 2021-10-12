import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import SwaggerUI from "swagger-ui-react";
import logo from "./logo.svg";
import "swagger-ui-react/swagger-ui.css";
import "./App.css";

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/openapi">
          <OpenApi />
        </Route>
        <Route path="/">
          <Home />
        </Route>
      </Switch>
    </Router>
  );
}

function Home() {
  const [datasets, setDatasets] = useState<Array<Record<string, unknown>>>();
  useEffect(() => {
    async function init() {
      const data = await (await fetch("api/datasets")).json();
      const datasets = data.payload.map((dataset: Record<string, number>) => (
        <div key={dataset.dataset_id}>
          {Object.keys(dataset).map((key) => (
            <option key={key} value={key}>
              {key}: {dataset[key]}
            </option>
          ))}
        </div>
      ));
      setDatasets(datasets);
    }
    init();
  }, []);
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>ExplainaBoard V2 Demo</p>
        <p>(requesting datasets... )</p>
        <div>{datasets}</div>
        <a
          className="App-link"
          href="http://explainaboard.nlpedia.ai/"
          target="_blank"
          rel="noopener noreferrer"
        >
          ExplainaBoard
        </a>
      </header>
    </div>
  );
}

function OpenApi() {
  return <SwaggerUI url="http://localhost:5000/api/openapi.json" />;
}

export default App;
