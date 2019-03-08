import * as os from 'os';

const log = require('npmlog')

export function isAutoBuildDisabled() {
  return !!process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD
}

export function flags(): string[] {
  const flagStr = process.env.OPENCV4NODEJS_AUTOBUILD_FLAGS
  if (typeof(flagStr) === "string") {
    log.silly('install', 'using flags from OPENCV4NODEJS_AUTOBUILD_FLAGS:', flagStr)
    return flagStr.split(' ')
  }
  return []
}

export function opencvVersion() {
  return process.env.OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION || '3.4.3'
}

export function numberOfCoresAvailable() {
  return os.cpus().length
}