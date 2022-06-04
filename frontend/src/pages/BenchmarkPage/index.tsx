import React from "react";
import "./index.css";
import { PageHeader } from "antd";
import { useHistory, useLocation } from "react-router-dom";
import { BenchmarkTable } from "../../components";
import { BenchmarkGlobal } from "../BenchmarkGlobal";
import { BenchmarkHome } from "../BenchmarkHome";

// useEffect(() => {
//   async function fetchBenchmark() {
//     const result = await backendClient.benchmarkBenchmarkIdGet(benchmarkID);
//     setbenchmark(result);
//   }
//   fetchBenchmark();
// }, [benchmarkID]);

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export function BenchmarkPage() {
  const history = useHistory();
  const query = useQuery();
  const name = query.get("name") || undefined;
  
  // const [benchmark, setbenchmark] = useState<Benchmark>();
  // const [benchmarkID, setbenchmarkID] = useState<string>("");

  // let bm_name = ""
  // if (name){
  //   bm_name = name
  // }
  // console.log("-------bm_name-----")
  // console.log(bm_name)

  // useEffect(() => {
  //   async function fetchBenchmark() {
  //     setbenchmark(await backendClient.benchmarkBenchmarkIdGet(benchmarkID));
  //   }
  //   fetchBenchmark();
  // }, [benchmarkID]);

  if (name === "Global") {
    return <BenchmarkGlobal/>;
  }
  else if (name) {
    let title = "";
    title = name;
    let subTitle = "";
    subTitle = `${name}`;

    return (
      <div>
        <PageHeader
          onBack={() => history.goBack()}
          title={title + " Benchmark"}
          subTitle={`Benchmark for ${subTitle}`}
        />
        <div style={{ padding: "0 10px" }}>
          <BenchmarkTable benchmarkID={name} />
        </div>
      </div>
    );
  } else {
    return <BenchmarkHome />;
  }
}
