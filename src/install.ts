import * as fs from 'fs';
import * as path from 'path';

import { opencvModules } from './constants';
import {
  applyEnvsFromPackageJson,
  autoBuildFlags,
  isAutoBuildDisabled,
  isWithoutContrib,
} from './env';
import { getLibsFactory } from './getLibsFactory';
import { setupOpencv } from './setupOpencv';
import { AutoBuildFile } from './types';
import { isOSX, isWin, requireCmake, requireGit } from './utils';
import { BuildContext } from './BuildContext';;

import * as log from 'npmlog';

const getLibs = getLibsFactory({ isWin, isOSX, opencvModules, path, fs })

function checkInstalledLibs(ctxt: BuildContext, autoBuildFile: AutoBuildFile) {
  let hasLibs = true

  log.info('install', 'checking for opencv libraries')

  if (!fs.existsSync(ctxt.opencvLibDir)) {
    log.info('install', 'library dir does not exist:', ctxt.opencvLibDir)
    return
  }
  const installedLibs = getLibs(ctxt.opencvLibDir)

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

export async function install(ctxt: BuildContext) {
  // if project directory has a package.json containing opencv4nodejs variables
  // apply these variables to the process environment
  applyEnvsFromPackageJson()

  if (isAutoBuildDisabled()) {
    log.info('install', 'OPENCV4NODEJS_DISABLE_AUTOBUILD is set')
    log.info('install', 'skipping auto build...')
    return
  }
  log.info('install', 'if you want to use an own OpenCV installation set OPENCV4NODEJS_DISABLE_AUTOBUILD')

  // prevent rebuild on every install
  const autoBuildFile = ctxt.readAutoBuildFile()
  if (autoBuildFile) {
    log.info('install', `found auto-build.json: ${ctxt.autoBuildFile}`)

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

  log.info('install', '')
  log.info('install', 'running install script...')
  log.info('install', '')
  log.info('install', 'opencv version: %s', opencvVersion())
  log.info('install', 'with opencv contrib: %s', isWithoutContrib() ? 'no' : 'yes')
  log.info('install', 'custom build flags: %s', autoBuildFlags())
  log.info('install', '')

  try {
    await requireGit()
    await requireCmake()
    await setupOpencv()
  } catch(err) {
    if (err.toString)
      log.error('install', err.toString())
    else
      log.error('install', JSON.stringify(err))
    process.exit(1)
  }
}
