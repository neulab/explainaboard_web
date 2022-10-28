import { AnalysisCase } from "../../../clients/openapi";
import { taskColumnMapping, ColumnInfo } from "./taskColumnMapping";

export function addPredictionColInfo(
  tsk: string,
  systemNames: string[]
): { [key: string]: string }[] {
  const finalColInfo = [];
  // add dataset groundtruth columns
  const taskCols = taskColumnMapping.get(tsk);
  if (taskCols === undefined) {
    throw new Error(`cannot handle undefined task: ${tsk}`);
  }
  taskCols.datasetColumns.forEach(function (col: ColumnInfo) {
    finalColInfo.push(col);
  });

  // add system prediction columns
  const predColInfo = taskCols.predictionColumns[0];
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

export function unnestAnalysisCases(
  analysisCases: AnalysisCase[],
  targetProp: string
): AnalysisCase[] {
  return analysisCases.map(function (analysisCase: AnalysisCase) {
    let processedAnalysisCase = { ...analysisCase };
    if (Array.isArray(analysisCase[targetProp])) {
      processedAnalysisCase = unnestArrayElement(analysisCase, targetProp);
    } else if (typeof analysisCase[targetProp] === "object") {
      processedAnalysisCase = unnestObjectElement(analysisCase, targetProp);
    } else {
      throw new Error(
        "cannot unnest properties that are not an array or an object"
      );
    }
    return processedAnalysisCase;
  });
}

/**
 * Unnests the property (type: object) specified by `targetProp`. The parent property
 * would be removed, and the children properties would be moved up one layer.
 */
function unnestObjectElement(analysisCase: AnalysisCase, targetProp: string) {
  const unnestedObj: AnalysisCase = {};
  Object.keys(analysisCase).forEach((key: string) => {
    if (key === targetProp) {
      Object.entries(analysisCase[key]).forEach((entry) => {
        const [k, v] = entry;
        unnestedObj[k] = v;
      });
    } else {
      unnestedObj[key] = analysisCase[key];
    }
  });

  return unnestedObj;
}

/**
 * Unnests the property (type: array) specified by `targetProp`. The unnested
 * keys would be the original property name with the index from its original array.
 */
function unnestArrayElement(analysisCase: AnalysisCase, targetProp: string) {
  const unnestedObj: AnalysisCase = {};
  Object.keys(analysisCase).forEach((key: string) => {
    if (key === targetProp) {
      analysisCase[key].forEach((value: number, index: string) => {
        unnestedObj[`${targetProp}.${index}`] = value;
      });
    } else {
      unnestedObj[key] = analysisCase[key];
    }
  });
  return unnestedObj;
}

export function joinResults(
  results: AnalysisCase[][],
  prop: string
): AnalysisCase[] {
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
