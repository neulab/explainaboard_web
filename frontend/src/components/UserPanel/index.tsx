import React from "react";
import { Button, Dropdown, Menu, Space, Spin, Tooltip, Typography } from "antd";
import { LoginState, useUser } from "..";
import { LoginOutlined, LogoutOutlined } from "@ant-design/icons";
import "./index.css";

export function UserPanel() {
  const { login, userInfo, state, logout } = useUser();
  const loginBtn = (
    <div>
      <Button size="small" onClick={login} icon={<LoginOutlined />}>
        Log in
      </Button>
    </div>
  );
  const userMenu = (
    <Menu className="menu" style={{ float: "right" }}>
      <Menu.Item className="menu-item">
        Email:{" "}
        <Typography.Paragraph copyable className="menu-item-text">
          {userInfo?.email}
        </Typography.Paragraph>
      </Menu.Item>
      <Menu.Item>
        API Key:{" "}
        <Typography.Paragraph copyable className="menu-item-text">
          {userInfo?.api_key}
        </Typography.Paragraph>
      </Menu.Item>
      <Menu.Item danger className="menu-item" onClick={logout}>
        <Tooltip
          placement="left"
          title="Currently, logging out from the web interface doesn't immediately invoke your access from our platform. Instead, your access will expire in a day (at which point, you have logged out completely). The support for a true logout will be added in the future."
        >
          Logout <LogoutOutlined />
        </Tooltip>
      </Menu.Item>
    </Menu>
  );

  switch (state) {
    case LoginState.no:
      return loginBtn;
    case LoginState.expired:
      return <Space>(Login expired) {loginBtn}</Space>;
    case LoginState.yes:
      if (userInfo) {
        return (
          <Dropdown overlay={userMenu} placement="bottomRight">
            <div>{`Hi, ${userInfo.preferred_username}!`}</div>
          </Dropdown>
        );
      }
      return loginBtn;

    case LoginState.loading:
      return (
        <div>
          <Spin size="small" />
        </div>
      );
  }
}
