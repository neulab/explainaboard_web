import React from "react";
import "./index.css";
import { Table } from "antd";

interface Props {
  view: string;
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  columns: Array<any>;
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  dataSource: Array<any>;
}

export function TableView({ view, columns, dataSource }: Props) {
  return <Table columns={columns} dataSource={dataSource} />;
}
