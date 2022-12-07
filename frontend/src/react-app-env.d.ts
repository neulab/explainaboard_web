/// <reference types="react-scripts" />
declare module "*.yaml" {
  const data: string;
  export default data;
}

declare module "raw-loader!*" {
  const data: string;
  export default data;
}
