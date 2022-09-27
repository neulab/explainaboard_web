import React from "react";
import { PageHeader } from "antd";
import { useHistory, useLocation } from "react-router-dom";
import { SystemsTable } from "../../components";
import "./index.css";
import { useGoogleAnalytics } from "../../components/useGoogleAnalytics";
import { Helmet } from "react-helmet";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

/**
 * Systems Page
 */
export function SystemsPage() {
  useGoogleAnalytics();
  const history = useHistory();
  const query = useQuery();

  return (
    <div className="page">
      <Helmet>
        <title>ExplainaBoard - Systems</title>
      </Helmet>
      <PageHeader
        onBack={() => history.goBack()}
        title="Systems"
        subTitle="All systems submitted by users"
        className="header"
      />
      <SystemsTable filters={query} />
    </div>
  );
}
