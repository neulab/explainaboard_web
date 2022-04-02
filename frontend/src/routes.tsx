import React, { ReactElement } from "react";
import { RouteProps } from "react-router";
import {
  HomeOutlined,
  DatabaseOutlined,
  TableOutlined,
  CodeOutlined,
  FileOutlined,
} from "@ant-design/icons";
import {
  DatasetsPage,
  Home,
  LeaderboardHome,
  LeaderboardPage,
  LoginCallback,
  SystemsPage,
  TermsPage,
} from "./pages";

export interface Route extends RouteProps {
  title?: string;
  path: string;
  icon?: ReactElement;
  subroutes?: Route[];
  /** do not display in the menu */
  hideFromMenu?: boolean;
  requireLogin?: boolean;
}
const routes: Route[] = [
  {
    path: "/",
    title: "Home",
    exact: true,
    icon: <HomeOutlined />,
    children: <Home />,
  },
  {
    path: "/datasets",
    title: "Datasets",
    icon: <DatabaseOutlined />,
    children: <DatasetsPage />,
  },
  {
    path: "/systems",
    title: "Systems",
    icon: <CodeOutlined />,
    children: <SystemsPage />,
    requireLogin: true,
  },
  {
    path: "/leaderboards",
    title: "Leaderboards",
    icon: <TableOutlined />,
    children: <LeaderboardHome />,
    exact: true,
  },
  {
    path: "/terms",
    title: "Terms",
    exact: true,
    icon: <FileOutlined />,
    children: <TermsPage />,
  },
  {
    path: "/leaderboards/:task",
    exact: true,
    children: <LeaderboardPage />,
    hideFromMenu: true,
    requireLogin: true,
  },
  {
    path: "/login-callback",
    exact: true,
    children: <LoginCallback />,
    hideFromMenu: true,
  },
];
export default routes;
