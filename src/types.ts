import { OpencvModulesType } from "./misc"

export type OpencvModule = {
  opencvModule: string
  libPath: string | undefined
}

export interface EnvSummery {
  opencvVersion: string,
  buildWithCuda: boolean,
  isWithoutContrib: boolean,
  isAutoBuildDisabled: boolean,
  buildRoot: string,
  cudaArch: string,
  autoBuildFlags: string,
  OPENCV_INCLUDE_DIR: string,
  OPENCV_LIB_DIR: string,
  OPENCV_BIN_DIR: string,
  modules: OpencvModulesType[],
}

export type AutoBuildFile = {
  opencvVersion: string
  autoBuildFlags: string
  modules: OpencvModule[]
  env: EnvSummery,
}