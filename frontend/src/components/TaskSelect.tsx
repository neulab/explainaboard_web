import React from "react";
import { Select, SelectProps } from "antd";
import { TaskCategory } from "../clients/openapi";

interface Props extends SelectProps<string> {
  taskCategories: TaskCategory[];
}
/** task select that shows categories */
export function TaskSelect({ taskCategories, ...props }: Props) {
  return (
    <Select showSearch {...props}>
      {taskCategories.map(({ name, tasks }, i) => (
        <Select.OptGroup label={name} key={i}>
          {tasks.map(({ name, supported }) => (
            <Select.Option value={name} key={name} disabled={!supported}>
              {name}
            </Select.Option>
          ))}
        </Select.OptGroup>
      ))}
    </Select>
  );
}
