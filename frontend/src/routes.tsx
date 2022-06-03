import React, { ReactElement } from "react";
import { RouteProps } from "react-router";
import {
  HomeOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  CodeOutlined,
  FileOutlined,
} from "@ant-design/icons";
import {
  DatasetsPage,
  Home,
  LeaderboardPage,
  BenchmarkPage,
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
    requireLogin: false,
  },
  {
    path: "/benchmark",
    title: "Benchmarks",
    icon: <LineChartOutlined />,
    children: <BenchmarkPage />,
    requireLogin: false,
  },
  {
    path: "/terms",
    title: "Terms",
    exact: true,
    icon: <FileOutlined />,
    children: <TermsPage />,
  },
  {
    path: "/login-callback",
    exact: true,
    children: <LoginCallback />,
    hideFromMenu: true,
  },
  {
    path: "/leaderboards",
    title: "Leaderboards",
    children: <LeaderboardPage />,
    requireLogin: false,
    hideFromMenu: true,
  },
];
export default routes;
