import React from "react";
import { Button, Dropdown, Menu, Spin, Typography } from "antd";
import { LoginState, useUser } from "..";
import { LoginOutlined, LogoutOutlined } from "@ant-design/icons";
import "./index.css";

export function UserPanel() {
  const { login, userInfo, state, logout } = useUser();
  const loginBtn = (
    <div>
      <Button size="small" onClick={login} icon={<LoginOutlined />}>
        Sign in
      </Button>
    </div>
  );
  const userMenu = (
    <Menu className="menu" style={{ float: "right" }}>
      <Menu.Item className="menu-item" key="email">
        Email:{" "}
        <Typography.Paragraph copyable className="menu-item-text">
          {userInfo?.email}
        </Typography.Paragraph>
      </Menu.Item>
      <Menu.Item className="menu-item" key="api_key">
        API Key:{" "}
        <Typography.Paragraph copyable className="menu-item-text">
          {userInfo?.api_key}
        </Typography.Paragraph>
      </Menu.Item>
      <Menu.Item danger className="menu-item" onClick={logout} key="logout">
        Sign out <LogoutOutlined />
      </Menu.Item>
    </Menu>
  );

  switch (state) {
    case LoginState.no:
      return loginBtn;
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
