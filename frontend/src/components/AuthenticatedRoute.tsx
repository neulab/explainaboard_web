import React from "react";
import { Button, Result, Space } from "antd";
import { Route, RouteProps, useHistory } from "react-router-dom";
import { LoginState, useUser } from "../utils";

export function AuthenticatedRoute(props: RouteProps) {
  const { state, login } = useUser();
  const history = useHistory();
  if (state === LoginState.yes) {
    return <Route {...props} />;
  }
  return (
    <Result
      status="403"
      title="Please sign in to view this page."
      style={{ marginTop: "10%" }}
      extra={
        <Space>
          <Button onClick={() => history.push("/")}>Home Page</Button>
          <Button onClick={login} type="primary">
            Log in
          </Button>
        </Space>
      }
    />
  );
}
