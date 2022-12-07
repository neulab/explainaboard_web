// Please remove
// 1. "const benchmark_config = "
// 2. all comments (lines prefixed with "//")
// before submitting as they are not allowed in JSON
//
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
const benchmark_config = {
  // == REQUIRED FIELDS ==
  id: "example",
  is_private: false,
  shared_users: ["example@gmail.com"],
  name: "Example Benchmark",
  // A parent benchmark id that this benchmark inherits config from.
  // If this benchmark doesn't inherit any configs,
  // the field must be an empty string
  parent: "",
  description: "Example Description",
  // == POTENTIALLY REQUIRED FIELDS ==
  // "views" is required if "parent" is an empty string
  views: [
    {
      name: "Example View",
      operations: [{ op: "mean", group_by: ["sub_dataset"] }],
    },
  ],
  // == OPTIONAL FIELDS ==
  // Specify "abstract" to indicate this doesn't
  // fully specify a benchmark
  type: "abstract",
  // Please contact us and send us your logo.
  // We will add it to our image store and update the link.
  logo: "",
  contact: "example@gmail.com",
  homepage: "https://example.com",
  paper: {
    // REQUIRED if paper is not None
    title: "Example Paper",
    url: "www.example.com",
  },
  metrics: [
    {
      // REQUIRED for each metrics element
      name: "ExampleMetric",
      // OPTIONAL
      weight: 1.0,
      default: 1.0,
    },
  ],
  datasets: [
    {
      // REQUIRED for each datasets element
      dataset_name: "example_dataset",
      // OPTIONAL
      sub_dataset: "example_sub_dataset",
      split: "test",
      metrics: [
        {
          // REQUIRED for each metrics element
          name: "ExampleMetric",
          // OPTIONAL
          weight: 1.0,
          default: 1.0,
        },
      ],
    },
  ],
  system_query: {
    task_name: "example-task",
  },
  default_views: ["Example View"],
};
