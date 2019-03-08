import * as fs from 'fs';
import * as path from 'path';

import { opencvModules } from './constants';
import { dirs } from './dirs';
import { autoBuildFlags, isAutoBuildDisabled, readAutoBuildFile, opencvVersion } from './env';
import { getLibsFactory } from './getLibsFactory';
import { setupOpencv } from './setupOpencv';
import { AutoBuildFile } from './types';
import { isOSX, isWin, requireCmake, requireGit } from './utils';

const log = require('npmlog')

const getLibs = getLibsFactory({ isWin, isOSX, opencvModules, path, fs })

function checkInstalledLibs(autoBuildFile: AutoBuildFile) {
  let hasLibs = true

  log.info('install', 'checking for opencv libraries')
  const installedLibs = getLibs(dirs.opencvLibDir)
  autoBuildFile.modules.forEach(({ opencvModule, libPath }) => {
    if (!libPath) {
      log.info('install', '%s: %s', opencvModule, 'ignored')
      return
    }
    const foundLib = installedLibs.find(lib => lib.opencvModule === opencvModule)
    hasLibs = hasLibs && !!foundLib
    log.info('install', '%s: %s', opencvModule, foundLib ? foundLib.libPath : 'not found')
  })

  return hasLibs
}

export async function install() {
  if (isAutoBuildDisabled()) {
    log.info('install', 'OPENCV4NODEJS_DISABLE_AUTOBUILD is set')
    log.info('install', 'skipping auto build...')
    return
  }
  log.info('install', 'if you want to use an own OpenCV installation set OPENCV4NODEJS_DISABLE_AUTOBUILD')

  // prevent rebuild on every install
  const autoBuildFile = readAutoBuildFile()
  if (autoBuildFile) {
    log.info('install', `found auto-build.json: ${dirs.autoBuildFile}`)

    if (autoBuildFile.opencvVersion !== opencvVersion()) {
      log.info('install', `auto build opencv version is ${autoBuildFile.opencvVersion}, but OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION=${opencvVersion()}`)
    } else if (autoBuildFile.autoBuildFlags !== autoBuildFlags()) {
      log.info('install', `auto build flags are ${autoBuildFile.autoBuildFlags}, but OPENCV4NODEJS_AUTOBUILD_FLAGS=${autoBuildFlags()}`)
    } else {
      const hasLibs = checkInstalledLibs(autoBuildFile)
      if (hasLibs) {
        log.info('install', 'found all libraries')
        return
      } else {
        log.info('install', 'missing some libraries')
      }
    }

  } else {
    log.info('install', `failed to find auto-build.json: ${dirs.autoBuildFile}`)
  }

  log.info('install', 'running install script...')

  try {
    await requireGit()
    await requireCmake()
    await setupOpencv()
  } catch(err) {
    log.error(err)
    process.exit(1)
  }
}
