import React from "react";

import logo from "../../logo-full.png";
import "./index.css";

export function Home() {
  return (
    <div className="h-full container flex flex-wrap items-center">
      <div
        className="w-full h-full bg-center bg-cover"
        style={{ backgroundImage: `url(${logo})` }}
      >
        <div className="w-full h-full bg-opacity-60 bg-black items-center flex">
          <div className="text-center ml-auto mr-auto">
            <h1 className="text-white text-6xl">ExplainaBoard</h1>
            <p className="text-white text-2xl ">
              An Explainable Leaderboard for NLP
            </p>
            <div className="relative flex flex-col min-w-0 break-words bg-white py-3 mx-20 shadow-lg rounded-lg">
              <h2 className="text-3xl">Do you want to?</h2>
              <ul className="list-disc text-xl text-left mx-16">
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
                  Go to Systems, select a system and click analysis
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
