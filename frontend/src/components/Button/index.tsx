import React from "react";
import { Button, ButtonProps, Tooltip } from "antd";
import { LoginState, useUser } from "../useUser";
import { capitalizeFirstLetter } from "../../utils/index";

interface Props extends ButtonProps {
  resourceName: string;
}

export function NewResourceButton(props: Props) {
  const { login, state } = useUser();
  const { resourceName, ...rest } = props;
  const capitalizedResourceName = capitalizeFirstLetter(resourceName);
  if (state === LoginState.yes)
    return (
      <Button
        style={{ backgroundColor: "#28a745", borderColor: "#28a745" }}
        type="primary"
        {...rest}
      >
        {`Submit New ${capitalizedResourceName}`}
      </Button>
    );
  return (
    <Tooltip
      title={`Please sign in to submit new ${resourceName}s`}
      placement="topLeft"
      defaultVisible
    >
      <Button
        onClick={login}
        style={{ borderColor: "#28a745", color: "#28a745" }}
      >
        {`Submit New ${capitalizedResourceName}`}
      </Button>
    </Tooltip>
  );
}
