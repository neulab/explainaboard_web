import React, { CSSProperties, useEffect, useState } from "react";
import { LoginState, useUser } from "../../components";
import { auth } from "firebaseui";
import {
  EmailAuthProvider,
  getAuth,
  sendEmailVerification,
} from "firebase/auth";
import "firebaseui/dist/firebaseui.css";
import "./index.css";
import { Alert, Spin, Typography } from "antd";

enum VerificationEmailState {
  notApplicable,
  sent,
  error,
}

export function Login() {
  const { state } = useUser();
  const [ui, setUi] = useState<auth.AuthUI>();
  const [verificationEmailState, setVerificationEmailState] = useState(
    VerificationEmailState.notApplicable
  );

  useEffect(() => {
    // Wait until authApp finishes initialization.
    if (state !== LoginState.loading) {
      const authApp = getAuth();
      let ui = auth.AuthUI.getInstance();
      if (!ui) {
        ui = new auth.AuthUI(authApp);
      }
      setUi(ui);
    }
  }, [state]);

  if (ui)
    ui.start("#firebaseui-auth-container", {
      signInSuccessUrl: "/login-callback",
      signInOptions: [
        {
          provider: EmailAuthProvider.PROVIDER_ID,
          requireDisplayName: true,
        },
      ],
      callbacks: {
        signInSuccessWithAuthResult(authResult) {
          const user = authResult.user;
          if (!user.emailVerified) {
            sendEmailVerification(authResult.user)
              .then(() => {
                setVerificationEmailState(VerificationEmailState.sent);
              })
              .catch((e) => {
                console.error(e);
                setVerificationEmailState(VerificationEmailState.error);
              });
            return false;
          }
          return true;
        },
      },
    });

  return (
    <div className="page-background">
      <VerificationEmailAlert state={verificationEmailState} />
      <div className="flex-container">
        <div className="half-page">
          <div className="vertical-center instruction-container">
            <div className="instruction-text">
              <Typography.Title style={{ textAlign: "center", color: "white" }}>
                Welcome to Explainaboard
              </Typography.Title>
              <Typography.Paragraph style={{ color: "white" }}>
                We have upgraded our sign-in experience to make it easier to use
                and more secure! Now, your sign-in status is synchronized across
                tabs and sessions. You can also sign out from all Explainaboard
                sessions with just one click.
              </Typography.Paragraph>

              <Typography.Paragraph style={{ color: "white" }}>
                If you{" "}
                <Typography.Text strong style={{ color: "white" }}>
                  have an account with us and this is the first time for you to
                  sign in with our new sign-in system
                </Typography.Text>
                , please reset your password: <br />
                &emsp;1. Enter your email address and click the <q>NEXT</q>{" "}
                button.
                <br />
                &emsp;2. Enter your <q>display name</q> and old password. Then,
                click the <q>SAVE</q> button.
                <br />
                &emsp;3. The popup will prompt you to reset your password.
                Please click <q>SEND</q> to send the reset password email and
                follow the instructions in the email.
              </Typography.Paragraph>
            </div>
          </div>
        </div>
        <div className="half-page">
          <div id="firebaseui-auth-container" className="vertical-center" />

          <Spin
            style={{ width: "100%", position: "relative" }}
            className="vertical-center"
            size="large"
            tip="Loading..."
            spinning={state === LoginState.loading}
          />
        </div>
      </div>
    </div>
  );
}

function VerificationEmailAlert({ state }: { state: VerificationEmailState }) {
  const style: CSSProperties = {
    position: "absolute",
    width: "100%",
    zIndex: 10000,
  };
  if (state === VerificationEmailState.sent) {
    return (
      <Alert
        type="info"
        message="We sent an email to the address you provided. Please click on the link in the email to complete your signup and sign in with your credentials. If you don't see it, you may need to check your spam folder."
        showIcon
        style={style}
      />
    );
  } else if (state === VerificationEmailState.error) {
    return (
      <Alert
        type="error"
        message="We encountered an error when sending the verification email. Please try signing in again later or contact us to resolve the issue."
        showIcon
        style={style}
      />
    );
  }
  return <></>;
}
