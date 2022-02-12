import React from "react";
import { Button, message, Result } from "antd";
import { useUser } from "../components";
import { useHistory } from "react-router-dom";

export function LoginCallback() {
  const { loginCallback } = useUser();
  const history = useHistory();

  /** if path has jwt token, parse and save to localstorage */
  function parseJWTWhenRedirect() {
    const hash = window.location.hash;
    if (hash.length > 0) {
      const segments = hash.substring(1).split("&");
      const jwtSegment = segments.find((segment) =>
        segment.startsWith("id_token=")
      );
      if (jwtSegment) {
        const newJWT = jwtSegment.substring("id_token=".length);
        loginCallback(newJWT);
      } else
        message.error(
          "Looks like we are not able to log you in. Please try again or contact the system admins."
        );
    }
  }
  parseJWTWhenRedirect();

  const homePageBtn = (
    <Button type="primary" onClick={() => history.push("/")}>
      Go to Homepage
    </Button>
  );
  return (
    <Result
      status="info"
      title="Log in"
      subTitle="You will be redirected shortly..."
      extra={homePageBtn}
      style={{ marginTop: "15%" }}
    />
  );
}
