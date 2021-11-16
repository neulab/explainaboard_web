import React, { useEffect, useState } from "react";
import { backendClient } from "../../clients";
import logo from "../../logo.svg";
import "./index.css";

export function Home() {
  const [datasets, setDatasets] = useState<string>();
  useEffect(() => {
    async function init() {
      const data = await backendClient.datasetsDatasetIdGet(11);
      setDatasets(JSON.stringify(data));
    }
    init();
  }, []);
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>ExplainaBoard</p>
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
