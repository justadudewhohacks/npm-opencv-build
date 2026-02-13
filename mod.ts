import OpenCVBuilder from "./src/OpenCVBuilder.ts";
export type { AutoBuildFile, OpencvModule } from "./src/types.ts";
export { default as OpenCVBuilder } from "./src/OpenCVBuilder.ts";
export { getLibsFactory } from "./src/getLibsFactory.ts";
export { default as OpenCVBuildEnv } from "./src/OpenCVBuildEnv.ts";
export {
  ALL_OPENCV_MODULES,
  ALLARGS,
  args2Option,
  genHelp,
  type OpenCVBuildEnvParams,
  type OpencvModulesType,
} from "./src/misc.ts";
export { default as Log } from "./src/Log.ts";
export type { LogLevels } from "./src/Log.ts";
export { default as StaticTools } from "./src/StaticTools.ts";
export { Platfrm } from "./src/env.ts";

export default OpenCVBuilder;
