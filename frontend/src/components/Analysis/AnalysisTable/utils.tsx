import { SystemOutput } from "../../../clients/openapi";
import { colInfoForTasks, predictionColForTasks } from "./supportedTasks";

export function addPredictionColInfo(
  tsk: string,
  systemNames: string[]
): { [key: string]: string }[] {
  const finalColInfo = [];
  // add dataset groundtruth columns
  colInfoForTasks.get(tsk).forEach(function (value: [key: string]) {
    finalColInfo.push(value);
  });

  // add system prediction columns
  const predColInfo = predictionColForTasks.get(tsk)[0];
  // single analysis
  if (systemNames.length === 1) {
    finalColInfo.push({
      id: `${predColInfo.id}`,
      name: `${predColInfo.name}`,
      maxWidth: "400px",
    });
    return finalColInfo;
  }
  // multi system analysis
  for (let i = 0; i < systemNames.length; i++) {
    finalColInfo.push({
      id: `${predColInfo.id}.${i}`,
      name: `${systemNames[i]}: ${predColInfo.name}`,
      maxWidth: "400px",
    });
  }
  return finalColInfo;
}

export function unnestSystemOutput(
  systemOutputs: SystemOutput[],
  targetProp: string
): SystemOutput[] {
  return systemOutputs.map(function (systemOutput: SystemOutput) {
    let processedSystemOutput = { ...systemOutput };

    processedSystemOutput = unnestElement(systemOutput, targetProp);
    return processedSystemOutput;
  });
}

function unnestElement(systemOutput: SystemOutput, targetProp: string) {
  const unnestedObj: SystemOutput = {};
  Object.keys(systemOutput).forEach((key: string) => {
    if (key === targetProp) {
      systemOutput[key].forEach((value: number, index: string) => {
        unnestedObj[`${targetProp}.${index}`] = value;
      });
    } else {
      unnestedObj[key] = systemOutput[key];
    }
  });

  return unnestedObj;
}

export function joinResults(
  results: SystemOutput[][],
  prop: string
): SystemOutput[] {
  // start from first result
  const joinedResult = [...results[0]];
  for (let i = 0; i < results[0].length; i++) {
    const row = results[0][i];
    const predictions = [row[prop]];

    // add other system predictions
    for (let sysId = 1; sysId < results.length; sysId++) {
      predictions.push(results[sysId][i][prop]);
    }
    /* an array that stores predictions for multi systems*/
    row[prop] = predictions;
  }
  return joinedResult;
}
