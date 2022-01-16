import React from "react";
import logo from "../../logo.svg";
import "./index.css";

export function Home() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>ExplainaBoard</p>
        <a
          className="App-link"
          href="http://explainaboard.nlpedia.ai/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Previous ExplainaBoard
        </a>
      </header>
    </div>
  );
}
