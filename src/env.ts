import * as fs from 'fs';
import * as os from 'os';

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

export function parseAutoBuildFlags(): string[] {
  const flagStr = autoBuildFlags()
  if (typeof(flagStr) === 'string' && flagStr.length) {
    log.silly('install', 'using flags from OPENCV4NODEJS_AUTOBUILD_FLAGS:', flagStr)
    return flagStr.split(' ')
  }
  return []
}

export function opencvVersion() {
  return process.env.OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION || '3.4.6'
}

export function numberOfCoresAvailable() {
  return os.cpus().length
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