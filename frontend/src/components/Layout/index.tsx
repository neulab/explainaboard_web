import React, { ReactNode, useState } from "react";
import { Dropdown, Layout as AntdLayout, Menu, Typography } from "antd";
import { Route } from "../../routes";
import "./index.css";
import logo from "../../logo-simple.png";
import { useHistory, useLocation } from "react-router";
import { useEnv } from "..";
import { UserPanel } from "../UserPanel";
import {
  TwitterCircleFilled,
  GithubFilled,
  FacebookFilled,
} from "@ant-design/icons";

interface Props {
  routes: Route[];
  children: ReactNode;
}

/** Basic layout of the web app. Renders sider menus and breadcrumbs based on the routes.
 *    - Sider menu only supports routes up to two levels. Dynamic routes are currently
 *    not supported.
 *    - The parent of the current path cannot be closed. Can change this behavior in the
 *    future.
 */
export const Layout: React.FC<Props> = ({ routes, children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const history = useHistory();
  const location = useLocation();
  const { env } = useEnv();

  const selectedMenus = [location.pathname];
  // first character of path is always "/" so skip first element of levels.
  // add current path's parent to open menu list by default
  const levels = location.pathname.substring(1).split("/");
  if (levels.length > 1 && !openMenus.includes("/" + levels[0]))
    setOpenMenus([...openMenus, "/" + levels[0]]);

  const toggle = () => {
    setCollapsed((curr) => !curr);
  };

  const toggleSubMenu = (menuKey: string) => {
    if (openMenus.includes(menuKey))
      setOpenMenus(openMenus.filter((key) => key !== menuKey));
    else setOpenMenus([...openMenus, menuKey]);
  };

  const githubMenu = (
    <Menu>
      <Menu.Item key="SDK">
        <Typography.Link
          href={"https://github.com/neulab/ExplainaBoard"}
          target="_blank"
        >
          SDK repo
        </Typography.Link>
      </Menu.Item>
      <Menu.Item key="CLI">
        <Typography.Link
          href={"https://github.com/neulab/explainaboard_client"}
          target="_blank"
        >
          Client repo
        </Typography.Link>
      </Menu.Item>
      <Menu.Item key="WEB">
        <Typography.Link
          href={"https://github.com/neulab/explainaboard_web"}
          target="_blank"
        >
          Web UI repo
        </Typography.Link>
      </Menu.Item>
    </Menu>
  );

  return (
    <AntdLayout style={{ minHeight: "100vh" }}>
      <AntdLayout.Sider collapsible collapsed={collapsed} onCollapse={toggle}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedMenus}
          openKeys={openMenus}
        >
          <Menu.Item
            key={"logo"}
            icon={<img src={logo} alt="" style={{ height: "20px" }} />}
            onClick={() => history.push("/")}
          >
            <div className="site-title">ExplainaBoard</div>
          </Menu.Item>
          {routes
            .filter(({ hideFromMenu }) => !hideFromMenu)
            .map(({ path, icon, title, subroutes }) => {
              if (subroutes && subroutes.length > 0) {
                return (
                  <Menu.SubMenu
                    key={path}
                    icon={icon}
                    title={title}
                    onTitleClick={() => toggleSubMenu(path)}
                  >
                    {subroutes.map((route) => {
                      const fullPath = path + route.path;
                      return (
                        <Menu.Item
                          key={fullPath}
                          icon={route.icon}
                          onClick={() => history.push(fullPath)}
                        >
                          {route.title}
                        </Menu.Item>
                      );
                    })}
                  </Menu.SubMenu>
                );
              }
              return (
                <Menu.Item
                  key={path}
                  icon={icon}
                  onClick={() => history.push(path)}
                >
                  {title}
                </Menu.Item>
              );
            })}
        </Menu>
      </AntdLayout.Sider>
      <AntdLayout className="site-layout">
        <AntdLayout.Header className="site-layout-header">
          <div className="header-items-container">
            <div className="header-icon">
              <Dropdown overlay={githubMenu} placement="bottom">
                <div>
                  <GithubFilled />
                </div>
              </Dropdown>
            </div>
            <div className="header-icon">
              <FacebookFilled />
            </div>
            <div className="header-icon">
              <TwitterCircleFilled />
            </div>
            <div style={{ paddingRight: "10px" }}>
              {env === "development" && "(development environment)"}
            </div>
            <UserPanel />
          </div>
        </AntdLayout.Header>
        <AntdLayout.Content>
          <div className="site-layout-content">{children}</div>
        </AntdLayout.Content>
      </AntdLayout>
    </AntdLayout>
  );
};
