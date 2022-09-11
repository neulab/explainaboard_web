import React from "react";
import { Typography } from "antd";

export function FallbackUI({ errorMessage }: { errorMessage?: string }) {
  return (
    <Typography.Text>
      <Typography.Paragraph>
        An error occurred in the analysis.
      </Typography.Paragraph>
      <Typography.Paragraph>
        {errorMessage ||
          "If you are doing a pair-wise analysis, double check if the selected systems use the same dataset."}
      </Typography.Paragraph>
      If you found a bug, kindly open an issue on{" "}
      <Typography.Link
        href="https://github.com/neulab/explainaboard_web"
        target="_blank"
      >
        our GitHub repo
      </Typography.Link>
      . Thanks!
    </Typography.Text>
  );
}
