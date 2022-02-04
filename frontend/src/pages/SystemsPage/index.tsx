import React from "react";
import { PageHeader } from "antd";
import { useHistory } from "react-router-dom";
import { SystemsTable } from "../../components";
import "./index.css";

/**
 * Systems Page
 */
export function SystemsPage() {
  const history = useHistory();

  return (
    <div className="page">
      <PageHeader
        onBack={() => history.goBack()}
        title="Systems"
        subTitle="All systems submitted by users"
        className="header"
      />
      <SystemsTable />
    </div>
  );
}
