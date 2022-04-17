import React, { ReactNode, useState } from "react";

import { InputNumber, Row, Col, Space, Typography } from "antd";
import { MultiRangeSlider } from "../../../components";

const { Text } = Typography;

interface Props {
  min: number;
  max: number;
  marks: { [key: number]: string };
  step: number;
  initialInputValues: number[];
}

export function BucketSlider(props: Props) {
  const { min, max, marks, initialInputValues, step } = props;
  const inputValuesOffset = 1;
  const intputNumbersPerRow = 4;
  const [inputValues, setInputValues] = useState<number[]>(initialInputValues);
  const inputValuesLength = initialInputValues.length;
  // Include `number` type for compatibility
  function onSliderChange(inputValues: number | number[]) {
    if (Array.isArray(inputValues)) {
      for (const value of inputValues) {
        if (Number.isNaN(value)) {
          return;
        }
      }
      // Slice off min (1st element) and max (last element)
      setInputValues(inputValues.slice(1, 1 + inputValuesLength));
    }
  }

  function onInputNumberChange(index: number, value: number) {
    setInputValues((prevInputValues) => [
      ...prevInputValues.slice(0, index),
      value,
      ...prevInputValues.slice(index + 1),
    ]);
  }

  const intputNumberRows = Math.ceil(inputValuesLength / intputNumbersPerRow);

  // + offset because we pad the head, which will be used to display the string
  let inputNumbersCount = inputValuesLength + inputValuesOffset;
  const inputNumbers = Array(intputNumberRows)
    .fill(null)
    .map((_, rowIndex) => {
      const numberOfCols = Math.min(intputNumbersPerRow, inputNumbersCount);
      const cols = Array(numberOfCols)
        .fill(null)
        .map((_, colIndex) => {
          let col;
          if (rowIndex == 0 && colIndex == 0) {
            col = <Text style={{ textAlign: "center" }}>Right bounds:</Text>;
          } else {
            // - offset because the index 1 corresponds to the inputValues[0]
            const inputValuesIdx =
              rowIndex * intputNumbersPerRow + colIndex - inputValuesOffset;
            col = (
              <InputNumber
                min={min}
                max={max}
                step={step}
                value={inputValues[inputValuesIdx]}
                onChange={(value) => {
                  onInputNumberChange(inputValuesIdx, value);
                }}
              />
            );
          }
          return (
            <Col span={Math.floor(24 / intputNumbersPerRow)} key={colIndex}>
              {col}
            </Col>
          );
        });
      inputNumbersCount -= intputNumbersPerRow;
      return (
        <Row key={rowIndex} style={{ alignItems: "center" }}>
          {cols}
        </Row>
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
            allowCross={false}
            style={{ marginLeft: "32px", marginRight: "32px" }}
          />
        </Col>
      </Row>
      {inputNumbers}
    </div>
  );
}
