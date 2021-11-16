import React, { useEffect, useState } from "react";
import { backendClient } from "../../clients";
import logo from "../../logo.svg";
import "./index.css";

export function Home() {
  const [system, setSystem] = useState<string>();
  useEffect(() => {
    async function init() {
      const data = await backendClient.systemsSystemIdGet(
        "6178746a42455b0303bd8d09"
      );
      setSystem(JSON.stringify(data));
    }
    init();
  }, []);
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>ExplainaBoard</p>
        <p>(requesting system id 6178746a42455b0303bd8d09... )</p>
        <div>{system}</div>
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
