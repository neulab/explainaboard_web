import React, { useEffect, useState } from "react";
import { Input, PageHeader, Space, Table, Tag, Typography } from "antd";
import { ColumnsType } from "antd/lib/table";
import { DatasetMetadata } from "../../clients/openapi";
import { backendClient } from "../../clients";
import { PageState } from "../../utils";
import { useHistory } from "react-router";

import { SystemOutputProps } from "../../clients/openapi";

export function AnalysisTable() {
  return (
    <Table
      className="table"
      // columns={}
      loading={true}
    />
  );
}
