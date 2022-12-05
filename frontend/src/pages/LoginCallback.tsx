import React from "react";
import { Button, Result } from "antd";
import { useUser } from "../components";
import { useHistory } from "react-router-dom";

export function LoginCallback() {
  const { loginCallback } = useUser();
  const history = useHistory();
  loginCallback();

  const homePageBtn = (
    <Button type="primary" onClick={() => history.push("/")}>
      Go to Homepage
    </Button>
  );
  return (
    <Result
      status="info"
      title="Sign in"
      subTitle="You will be redirected shortly..."
      extra={homePageBtn}
      style={{ marginTop: "15%" }}
    />
  );
}
