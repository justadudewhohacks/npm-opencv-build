import fs from 'fs';
import os from 'os';
import path from 'path';
import log from 'npmlog';
import { highlight } from './utils';

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

const env = {
  isAutoBuildDisabled: (): boolean => !!process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD,
  buildWithCuda: (): boolean => !!process.env.OPENCV4NODEJS_BUILD_CUDA || false,
  isWithoutContrib: (): boolean => !!process.env.OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB,
  autoBuildFlags: (): string => process.env.OPENCV4NODEJS_AUTOBUILD_FLAGS || '',
  numberOfCoresAvailable: (): number => os.cpus().length,

  parseAutoBuildFlags: (): string[] => {
    const flagStr = env.autoBuildFlags()
    if (typeof (flagStr) === 'string' && flagStr.length) {
      log.silly('install', 'using flags from OPENCV4NODEJS_AUTOBUILD_FLAGS:', flagStr)
      return flagStr.split(' ')
    }
    return []
  },

  getCwd: (): string => {
    const cwd = process.env.INIT_CWD || process.cwd()
    if (!cwd) {
      throw new Error('process.env.INIT_CWD || process.cwd() is undefined or empty')
    }
    return cwd
  },

  parsePackageJson: (): { file: string, data: any } | null => {
    const absPath = path.resolve(env.getCwd(), 'package.json')
    if (!fs.existsSync(absPath)) {
      return null
    }
    log.info('config', `looking for opencv4nodejs option from ${highlight("%s")}`, absPath);
    const data = JSON.parse(fs.readFileSync(absPath).toString())
    return { file: absPath, data };
  },

  /**
   * get opencv4nodejs section from package.json if available
   * @returns opencv4nodejs customs
   */
  readEnvsFromPackageJson: (): { [key: string]: string | boolean | number } => {
    const rootPackageJSON = env.parsePackageJson()
    if (rootPackageJSON && rootPackageJSON.data) {
      if (rootPackageJSON.data.opencv4nodejs) {
        log.info('config', `found opencv4nodejs section in ${highlight(rootPackageJSON.file)}`);
        return rootPackageJSON.data.opencv4nodejs
      } else {
        log.info('config', `no opencv4nodejs section found in ${highlight(rootPackageJSON.file)}`);
      }
    }
    return {};
  },

  applyEnvsFromPackageJson: () => {
    let envs: OpenCVBuildOption = {};
    try {
      envs = env.readEnvsFromPackageJson()
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
}

export default env;