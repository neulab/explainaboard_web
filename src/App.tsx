import React, { useEffect, useState } from "react";
import logo from "./logo.svg";
import "./App.css";

function App() {
  const [apiVersion, setApiVersion] = useState<string>();
  useEffect(() => {
    async function init() {
      const version = (await (await fetch("api/version")).json()).data;
      setApiVersion(version);
    }
    init();
  }, []);
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>ExplainaBoard V2 Demo (requesting API version {apiVersion})</p>
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

export default App;
