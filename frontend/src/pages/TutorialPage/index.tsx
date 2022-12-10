import React from "react";
import "./index.css";
import { Helmet } from "react-helmet";
import { useGoogleAnalytics } from "../../components/useGoogleAnalytics";
import { Divider, Typography, Image } from "antd";
import { PlusOutlined } from "@ant-design/icons";

const { Title, Paragraph, Text, Link } = Typography;
/**
 * Tutorial Page
 */

export function TutorialPage() {
  useGoogleAnalytics();

  return (
    <div className="page">
      <Helmet>
        <title>ExplainaBoard - Tutorials</title>
      </Helmet>
      <Typography>
        <Title>What is ExplainaBoard? Why Do We Need It?</Title>
        <Paragraph>
          The reason why we created ExplainaBoard is to do automatic evaluation
          for users. We want to be able to save time after they already took a
          long time training and tuning their models.
        </Paragraph>

        <Title level={2}>Getting Started</Title>
        <Paragraph>
          In this quickstart guide, we will walk you through the basic
          functionalities of ExplainaBoard:
        </Paragraph>
        <Paragraph>
          <ul>
            <li>
              <a href="#upload-system">Upload a system </a>
            </li>
            <li>
              <a href="#view-analysis">
                View detailed analysis of your outputs
              </a>
            </li>
          </ul>
        </Paragraph>
        <Divider />
        <Title level={2} id="upload-system">
          Upload a System
        </Title>
        <Paragraph>
          We will be using a text classification example for this tutorial.
          Please download the <Text code>output_sst2.txt</Text> file{" "}
          <Link href="https://github.com/neulab/ExplainaBoard/blob/main/integration_tests/artifacts/text_classification/output_sst2.txt">
            here
          </Link>{" "}
          which contains a model prediction for the sst2 dataset.
          <ol>
            <li>
              On the side menu on the right, click on the{" "}
              <Text strong>Systems</Text> tab.
            </li>
            <Image
              src={"/screenshots/systemsTab.png"}
              preview={false}
              style={{
                width: "200px",
                maxWidth: "90%",
                margin: "10px 0 10px 100px",
              }}
            />
            <li>
              Along the filter bar in the systems page, click the{" "}
              <Text strong>New</Text> button.
            </li>
            <Image
              src={"/screenshots/filterBar.png"}
              preview={false}
              style={{ maxWidth: "90%", marginLeft: "50px" }}
            />
            <li>
              For <Text strong>Task</Text>, select
              &quot;text-classification&quot;.
            </li>
            <li>
              In the <Text strong>Dataset</Text> box, search for{" "}
              <Text code>sst2</Text> and click on it.
            </li>
            <li>
              In the dataset <Text strong>Split</Text> box, select
              &quot;test&quot;. Meaning this is the model prediction for sst2
              test split.
            </li>
            <li>
              Click on{" "}
              <Text strong>
                <PlusOutlined />
                Add File
              </Text>{" "}
              and choose the <Text code>output_sst2.txt</Text> file you just
              downloaded.
            </li>
            <li>
              In <Text strong>System Name</Text>, enter any name you want, but
              you cannot leave it blank.
            </li>
            <li>
              In <Text strong>Metrics</Text>, select &quot;Accuracy&quot;.
            </li>
            <li>
              You should have something that looks like this in the end. Click
              on the <Text strong>Submit</Text> button to submit.
            </li>
            <Image
              src={"/screenshots/submissionDrawer.png"}
              preview={false}
              style={{
                width: "700px",
                maxWidth: "90%",
                margin: "10px 0 10px 50px",
              }}
            />
            <li>
              After you submit, you should be able to find your system on the
              systems page!
            </li>
            <Image
              src={"/screenshots/submitSuccess.png"}
              preview={false}
              style={{ maxWidth: "90%", margin: "10px 0 10px 50px" }}
            />
          </ol>
        </Paragraph>
        <Divider />
        <Title level={2} id="view-analysis">
          View detailed analysis of your outputs
        </Title>
        <Paragraph>
          <ol>
            <li>
              On the Systems page, find a system you want to analyze and click
              the <Text strong>Analysis</Text> button on its right to enter the
              Analysis page.
            </li>
            <Image
              width={100}
              src={"/screenshots/analysisButton.png"}
              preview={false}
              style={{ maxWidth: "90%", margin: "10px 0 10px 50px" }}
            />
            <li>
              On the top, you will see an{" "}
              <Text strong>Overall Performance</Text> bar chart which will
              display your overall system performance on different metrics.{" "}
            </li>
            <Image
              src={"/screenshots/overallPerformance.png"}
              preview={false}
              style={{ maxWidth: "90%", margin: "10px 0 10px 50px" }}
            />
            <li>
              Below that, the <Text strong>Fine-grained Performance</Text>{" "}
              section displays one bar chart for each feature. You can view the
              results for different metrics by switching tabs.
            </li>
            <Image
              src={"/screenshots/finegrainedPerformanceMetricTab.png"}
              preview={false}
              style={{ maxWidth: "90%", margin: "10px 0 10px 50px" }}
            />
            <li>
              By clicking on any of the bars in a bar chart, an example table
              would show up at the bottom of the page. This table will sample
              some of the data points which lies in that particular bar. For
              example, in a machine translation task, you can use it to compare
              the reference and your hypothesis.
            </li>
            <Image
              src={"/screenshots/exampleTable.png"}
              preview={false}
              style={{ maxWidth: "90%", margin: "10px 0 10px 50px" }}
            />
          </ol>
        </Paragraph>
      </Typography>
    </div>
  );
}
