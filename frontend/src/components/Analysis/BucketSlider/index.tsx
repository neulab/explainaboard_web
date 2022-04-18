import React from "react";

import { InputNumber, Row, Col, Typography, Button } from "antd";
import { MultiRangeSlider } from "../../../components";
import { PlusOutlined, MinusOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface Props {
  min: number;
  max: number;
  marks: { [key: number]: string };
  step: number;
  inputValues: number[];
  onChange: (rightBounds: number[]) => void;
}

export function BucketSlider(props: Props) {
  const { min, max, marks, inputValues, step, onChange } = props;
  const inputValuesHeadOffset = 1; // for "Right bounds:" string
  const inputNumberColSpan = 6;

  // Include `number` type for compatibility
  function onSliderChange(inputValues: number | number[]) {
    if (Array.isArray(inputValues)) {
      for (const value of inputValues) {
        if (Number.isNaN(value)) {
          return;
        }
      }
      // Slice off min (1st element) and max (last element) as they should not be included.
      onChange(inputValues.slice(1, inputValues.length - 1));
    }
  }

  function onInputNumberChange(
    index: number,
    value: number,
    inputValues: number[]
  ) {
    // value can be null when the input is blank
    value = value || 0;
    const newInputValues = [
      ...inputValues.slice(0, index),
      value,
      ...inputValues.slice(index + 1),
    ];
    onChange(newInputValues);
  }

  function addInputValue(inputValues: number[], newValue: number) {
    inputValues.push(newValue);
    onChange(inputValues);
  }

  function deleteInputValue(inputValues: number[]) {
    inputValues.pop();
    onChange(inputValues);
  }

  // + offset because we pad the head, which will be used to display the text "Right bounds:"
  const inputNumbersCount = inputValues.length + inputValuesHeadOffset;
  const intputNumberCols = Array(inputNumbersCount)
    .fill(null)
    .map((_, colIndex) => {
      let col;
      if (colIndex === 0) {
        col = <Text style={{ textAlign: "center" }}>Right bounds:</Text>;
      } else {
        // - offset because the index 1 corresponds to the inputValues[0]
        const inputValuesIdx = colIndex - inputValuesHeadOffset;
        col = (
          <InputNumber
            min={min}
            max={max}
            step={step}
            value={inputValues[inputValuesIdx]}
            onChange={(value) => {
              onInputNumberChange(inputValuesIdx, value, inputValues);
            }}
          />
        );
      }
      return (
        <Col span={inputNumberColSpan} key={colIndex}>
          {col}
        </Col>
      );
    });

  return (
    <div>
      <Row>
        <Col span={24}>
          <MultiRangeSlider
            range
            min={min}
            max={max}
            marks={marks}
            onChange={onSliderChange}
            value={[min, ...inputValues, max]}
            step={step}
            style={{ marginLeft: "32px", marginRight: "32px" }}
          />
        </Col>
      </Row>
      <Row style={{ alignItems: "center" }}>
        {intputNumberCols}
        <Col span={2}>
          <Button
            size="small"
            shape="circle"
            icon={<MinusOutlined />}
            onClick={() => deleteInputValue(inputValues)}
          />
        </Col>
        <Col span={2}>
          <Button
            size="small"
            shape="circle"
            icon={<PlusOutlined />}
            onClick={() => addInputValue(inputValues, max)}
          />
        </Col>
      </Row>
    </div>
  );
}
