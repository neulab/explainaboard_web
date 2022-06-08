import React from "react";

import logo from "../../logo-full.png";
import "./index.css";

export function Home() {
  return (
    <div className="h-full flex items-center">
      <div
        className="w-full h-full bg-center bg-cover"
        style={{ backgroundImage: `url(${logo})` }}
      >
        <div className="w-full h-full bg-opacity-60 items-center flex">
          <div className="text-center ml-auto mr-auto">
            <h1 className="text-white text-6xl mb-0">ExplainaBoard</h1>
            <p className="text-white text-2xl ">
              An Explainable Leaderboard for NLP
            </p>
            <div className="relative flex flex-col min-w-0 break-words bg-white py-3 mx-20 rounded-lg">
              <h2 className="text-3xl">Do you want to?</h2>
              <ul className="text-xl text-left mx-16">
                <li className="mb-1">
                  Upload and analyze your own system results on an existing
                  dataset:
                  <br />
                  Go to Systems and click New
                </li>
                <li className="mb-1">
                  View a list of supported datasets:
                  <br />
                  Go to Datasets
                </li>

                <li className="mb-1">
                  View well-performing systems on a particular dataset, and
                  compare/contrast their strengths and weaknesses:
                  <br />
                  Go to Systems, select a system or systems and click Analysis
                </li>
                <li className="mb-1">
                  Ask a question, report an issue, or contribute to
                  ExplainaBoard:
                  <br />
                  File an issue on the github for the{" "}
                  <a href="https://github.com/neulab/explainaboard">
                    ExplainaBoard backend
                  </a>
                  {" or "}
                  <a href="https://github.com/neulab/explainaboard_web">
                    web UI
                  </a>
                  .
                </li>
                <a
                  href="https://clustrmaps.com/site/1bous"
                  title="Visit tracker"
                >
                  <img
                    src="//www.clustrmaps.com/map_v2.png?d=4w5ZLB0Wy8N5px0mxkUN7jnJAOrw2RFa7AuVKa-9DQs&cl=ffffff"
                    style={{ display: "none" }}
                  />
                </a>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
