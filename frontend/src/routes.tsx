import React, { ReactElement } from "react";
import { RouteProps } from "react-router";
import {
  HomeOutlined,
  DatabaseOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { Home } from "./pages";

export interface Route extends RouteProps {
  title: string;
  path: string;
  icon?: ReactElement;
  subroutes?: Route[];
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
  },
  {
    path: "/leaderboards",
    title: "Leaderboards",
    icon: <TableOutlined />,
    subroutes: [
      { path: "/ner", title: "NER" },
      { path: "/classification", title: "Text Classification" },
    ],
  },
];
export default routes;
