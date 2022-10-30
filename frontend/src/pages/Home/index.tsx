import React from "react";

import "./index.css";
import logo from "../../logo-full-v2.png";
import { useGoogleAnalytics } from "../../components/useGoogleAnalytics";
import { Helmet } from "react-helmet";
import { Button, Card, Col, Row } from "antd";
import { useHistory } from "react-router";
import {
  DatabaseOutlined,
  LineChartOutlined,
  CodeOutlined,
  DoubleRightOutlined,
  DoubleLeftOutlined,
} from "@ant-design/icons";

export function Home() {
  useGoogleAnalytics();
  const history = useHistory();
  return (
    <div className="h-full flex items-center">
      <Helmet>
        <title>ExplainaBoard - Explainable Leaderboards</title>
      </Helmet>
      <div className="w-full h-full bg-white">
        <div
          className="w-full h-50 bg-center bg-cover mb-4"
          style={{ backgroundImage: `url(${logo})` }}
        >
          <div className="background-mask flex items-center">
            <div>
              <div className="w-full text-center ml-auto mr-auto mt-3">
                <h1 className="text-6xl header-style">ExplainaBoard</h1>
              </div>
              <div className="w-80 text-center ml-auto mr-auto mb-3">
                <p className="text-2xl text-font text-bold text-light">
                  Want to understand why your machine learning systems are
                  working or failing?
                </p>
                <p className="text-2xl text-font text-bold text-light">
                  ExplainaBoard can help!
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="items-center mb-4">
          <Row className="flex">
            <Col offset={1} span={6} className="items-center flex">
              <Card
                hoverable
                className="homepage-card"
                onClick={() => history.push("/datasets")}
              >
                <div className="text-2xl text-font text-center text-bold text-dark mb-2">
                  <DatabaseOutlined /> Datasets
                </div>
                <div className="text-center text-dark ml-auto mr-auto text-font">
                  Start exploring all the datasets we offer and their
                  corresponding leaderboards.
                </div>
              </Card>
            </Col>
            <Col offset={2} span={6}>
              <Card
                hoverable
                className="homepage-card"
                onClick={() => history.push("/systems")}
              >
                <div className="text-2xl text-font text-center text-bold text-dark mb-2">
                  <LineChartOutlined /> Systems
                </div>
                <div className="text-center text-dark ml-auto mr-auto text-font">
                  Submit your ML systems and ExplainaBoard will do the
                  evaluation and analysis for you.
                </div>
              </Card>
            </Col>
            <Col offset={2} span={6}>
              <Card
                hoverable
                className="homepage-card"
                onClick={() => history.push("/benchmark")}
              >
                <div className="text-2xl text-font text-center text-bold text-dark mb-2">
                  <CodeOutlined /> Benchmarks
                </div>
                <div className="text-center text-dark ml-auto mr-auto text-font">
                  View and compare your systems on multiple datasets and tasks
                  all at once.
                </div>
              </Card>
            </Col>
          </Row>
        </div>
        <div className="w-full flex items-center">
          <Button
            type="primary"
            size="large"
            onClick={() => history.push("/systems")}
          >
            <div className="text-font text-center text-bold">
              <DoubleRightOutlined /> Submit your first system!{" "}
              <DoubleLeftOutlined />
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
