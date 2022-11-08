import React from "react";
import { PageHeader } from "antd";
import { useHistory } from "react-router-dom";
import { SystemsTable } from "../../components";
import "./index.css";
import { useGoogleAnalytics } from "../../components/useGoogleAnalytics";
import { Helmet } from "react-helmet";

/**
 * Systems Page
 */
export function SystemsPage() {
  useGoogleAnalytics();
  const history = useHistory();

  return (
    <div className="page">
      <Helmet>
        <title>ExplainaBoard - Systems</title>
      </Helmet>
      <PageHeader
        onBack={() => history.push("/")}
        title="Systems"
        subTitle="All systems submitted by users"
        className="header"
      />
      <SystemsTable />
    </div>
  );
}
