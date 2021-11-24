import React, { useEffect, useState } from "react";
import { backendClient } from "../../clients";
import logo from "../../logo.svg";
import "./index.css";

export function Home() {
  const [systemMetadata, setSystemMetadata] = useState<string>();
  useEffect(() => {
    async function init() {
      const data = await backendClient.systemMetadataSystemMetadataIdGet(
        "618c8af297d899127212916f"
      );
      setSystemMetadata(JSON.stringify(data));
    }
    init();
  }, []);
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>ExplainaBoard</p>
        <p>(Request system id 618c8af297d899127212916f:)</p>
        <div>{systemMetadata}</div>
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
