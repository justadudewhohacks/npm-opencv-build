import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { dirs } from './dirs';
import { AutoBuildFile } from './types';

const log = require('npmlog')

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

export function opencvVersion() {
  return process.env.OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION || '3.4.6'
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

export function readAutoBuildFile(): AutoBuildFile | undefined {
  try {
    const fileExists = fs.existsSync(dirs.autoBuildFile)
    if (fileExists) {
      const autoBuildFile = JSON.parse(fs.readFileSync(dirs.autoBuildFile).toString()) as AutoBuildFile
      if (!autoBuildFile.opencvVersion || !('autoBuildFlags' in autoBuildFile) || !Array.isArray(autoBuildFile.modules)) {
        throw new Error('auto-build.json has invalid contents')
      }
      return autoBuildFile
    }
    log.info('readAutoBuildFile', 'file does not exists: %s', dirs.autoBuildFile, dirs.autoBuildFile)
  } catch (err) {
    log.error('readAutoBuildFile', 'failed to read auto-build.json from: %s, with error: %s', dirs.autoBuildFile, err.toString())
  }
  return undefined
}

function parsePackageJson() {
  if (!process.env.INIT_CWD) {
    log.error('process.env.INIT_CWD is undefined or empty')
    return
  }
  const absPath = path.resolve(process.env.INIT_CWD, 'package.json')
  if (!fs.existsSync(absPath)) {
    log.info('No package.json in folder.')
    return
  }

  try {
    return JSON.parse(fs.readFileSync(absPath).toString())
  } catch (error) {
    log.error('failed to parse package.json:')
    log.error(error)
  }
}

export function readEnvsFromPackageJson() {
  const rootPackageJSON = parsePackageJson()
  if (!rootPackageJSON || !rootPackageJSON.opencv4nodejs) {
    return
  }

  const envs = Object.keys(rootPackageJSON.opencv4nodejs)
  if (envs.length) {
    log.info('the following opencv4nodejs environment variables are set in the package.json:')
    envs.forEach(key => log.info(`${key}: ${rootPackageJSON.opencv4nodejs[key]}`))
  }

  const {
    autoBuildBuildCuda,
    autoBuildFlags,
    autoBuildOpenCVVersion,
    autoBuildWithoutContrib,
    disableAutoBuild,
    opencvIncludeDir,
    opencvLibDir,
    opencvBinDir
  } = rootPackageJSON.opencv4nodejs

  if (autoBuildFlags) {
    process.env.OPENCV4NODEJS_AUTOBUILD_FLAGS = autoBuildFlags
  }

  if (autoBuildBuildCuda) {
    process.env.OPENCV4NODEJS_BUILD_CUDA = autoBuildBuildCuda
  }

  if (autoBuildOpenCVVersion) {
    process.env.OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION = autoBuildOpenCVVersion
  }

  if (autoBuildWithoutContrib) {
    process.env.OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB = autoBuildWithoutContrib
  }

  if (disableAutoBuild) {
    process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD = disableAutoBuild
  }

  if (opencvIncludeDir) {
    process.env.OPENCV_INCLUDE_DIR = opencvIncludeDir
  }

  if (opencvLibDir) {
    process.env.OPENCV_LIB_DIR = opencvLibDir
  }

  if (opencvBinDir) {
    process.env.OPENCV_BIN_DIR = opencvBinDir
  }
}