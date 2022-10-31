import React, { ReactElement } from "react";
import "./index.css";
import { Card } from "antd";

interface Props {
  title: string;
  icon: ReactElement;
  onClick: () => void;
  description: string;
}

export function HomepageCard({ title, icon, onClick, description }: Props) {
  return (
    <Card hoverable className="homepage-card" onClick={onClick}>
      <div className="card-title">
        {icon} {title}
      </div>
      <div className="card-body">{description}</div>
    </Card>
  );
}
