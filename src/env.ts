import fs from 'fs';
import os from 'os';
import path from 'path';
import log from 'npmlog';


export function isAutoBuildDisabled() {
  return !!process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD
}

export function buildWithCuda() : boolean {
  return !!process.env.OPENCV4NODEJS_BUILD_CUDA || false;
}

export function isWithoutContrib() {
  return !!process.env.OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB
}

export function autoBuildFlags(): string {
  return process.env.OPENCV4NODEJS_AUTOBUILD_FLAGS || ''
}

export function numberOfCoresAvailable() {
  return os.cpus().length
}

export function parseAutoBuildFlags(): string[] {
  const flagStr = autoBuildFlags()
  if (typeof(flagStr) === 'string' && flagStr.length) {
    log.silly('install', 'using flags from OPENCV4NODEJS_AUTOBUILD_FLAGS:', flagStr)
    return flagStr.split(' ')
  }
  return []
}

export function getCwd() {
  const cwd = process.env.INIT_CWD || process.cwd()
  if (!cwd) {
    throw new Error('process.env.INIT_CWD || process.cwd() is undefined or empty')
  }
  return cwd
}

function parsePackageJson() {
  const absPath = path.resolve(getCwd(), 'package.json')
  if (!fs.existsSync(absPath)) {
    return null
  }
  log.info('config', `looking for opencv4nodejs option from ${absPath}`);
  return JSON.parse(fs.readFileSync(absPath).toString())
}

/**
 * get opencv4nodejs section from package.json if available
 * @returns opencv4nodejs customs
 */
export function readEnvsFromPackageJson(): {[key:string]: string | boolean | number} {
  const rootPackageJSON = parsePackageJson()
  return rootPackageJSON
    ? (rootPackageJSON.opencv4nodejs || {})
    : {}
}

export interface OpenCVBuildOption {
  autoBuildBuildCuda?: string;
  autoBuildFlags?: string;
  autoBuildOpencvVersion?: string;
  autoBuildWithoutContrib?: string;
  disableAutoBuild?: string;
  opencvIncludeDir?: string;
  opencvLibDir?: string;
  opencvBinDir?: string;
}

export function applyEnvsFromPackageJson() {
  let envs: OpenCVBuildOption = {};
  try {
    envs = readEnvsFromPackageJson()
  } catch (err) {
    log.error('applyEnvsFromPackageJson', 'failed to parse package.json:')
    log.error('applyEnvsFromPackageJson', err)
  }

  const envKeys = Object.keys(envs)
  if (envKeys.length) {
    log.info('applyEnvsFromPackageJson', 'the following opencv4nodejs environment variables are set in the package.json:')
    envKeys.forEach(key => log.info('applyEnvsFromPackageJson', `${key}: ${(envs as any)[key]}`))
  }

  const {
    autoBuildBuildCuda,
    autoBuildFlags,
    autoBuildOpencvVersion,
    autoBuildWithoutContrib,
    disableAutoBuild,
    opencvIncludeDir,
    opencvLibDir,
    opencvBinDir
  } = envs

  if (autoBuildFlags) {
    process.env.OPENCV4NODEJS_AUTOBUILD_FLAGS = '' + autoBuildFlags
  }

  if (autoBuildBuildCuda) {
    process.env.OPENCV4NODEJS_BUILD_CUDA = '' + autoBuildBuildCuda
  }

  if (autoBuildOpencvVersion) {
    process.env.OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION = '' + autoBuildOpencvVersion
  }

  if (autoBuildWithoutContrib) {
    process.env.OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB = '' + autoBuildWithoutContrib
  }

  if (disableAutoBuild) {
    process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD = '' + disableAutoBuild
  }

  if (opencvIncludeDir) {
    process.env.OPENCV_INCLUDE_DIR = '' + opencvIncludeDir
  }

  if (opencvLibDir) {
    process.env.OPENCV_LIB_DIR = '' + opencvLibDir
  }

  if (opencvBinDir) {
    process.env.OPENCV_BIN_DIR = '' + opencvBinDir
  }
}