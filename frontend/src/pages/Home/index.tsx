import React from "react";

import logo from "../../logo-full.png";
import "./index.css";

export function Home() {
  return (
    <div className="h-full container flex flex-wrap items-center">
      <div
        className="w-full h-4/5 bg-center bg-cover"
        style={{ backgroundImage: `url(${logo})` }}
      >
        <div className="w-full h-full bg-opacity-60 bg-black items-center flex">
          <div className="text-center ml-auto mr-auto">
            <h1 className="text-white text-6xl">ExplainaBoard</h1>
            <p className="text-white text-2xl ">
              An Explainable Leaderboard for NLP
            </p>
          </div>
        </div>
        ˜
      </div>
      <div className="text-center ml-auto mr-auto px-20">
        <h2 className="text-3xl">Do you want to?</h2>
        <ul className="list-disc text-xl text-left">
          <li>
            Upload and analyze your own system results on an existing dataset.
          </li>
          <li>View a list of supported datasets.</li>
          <li>
            View well-performing systems on a particular dataset, and
            compare/contrast their strengths and weaknesses.
          </li>
        </ul>
      </div>
    </div>
  );
}
