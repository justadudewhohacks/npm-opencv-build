import fs from 'fs';
import path from 'path';
import { opencvModules } from './constants.js';
import env from './env.js';
import { getLibsFactory } from './getLibsFactory.js';
import { setupOpencv } from './setupOpencv.js';
import type { AutoBuildFile } from './types.js';
import { isOSX, isWin, requireCmake, requireGit, highlight } from './utils.js';
import { BuildContext } from './BuildContext.js';

import log from 'npmlog';

/**
 * called from `npm run do-install` triggered by postinstall script
 */

const getLibs = getLibsFactory({ isWin, isOSX, opencvModules, path, fs })

function checkInstalledLibs(ctxt: BuildContext, autoBuildFile: AutoBuildFile): boolean {
  let hasLibs = true

  log.info('install', 'checking for opencv libraries')

  if (!fs.existsSync(ctxt.opencvLibDir)) {
    log.info('install', 'library dir does not exist:', ctxt.opencvLibDir)
    return false
  }
  const installedLibs = getLibs(ctxt.opencvLibDir)

  autoBuildFile.modules.forEach(({ opencvModule, libPath }) => {
    if (!libPath) {
      log.info('install', '%s: %s', opencvModule, 'ignored')
      return
    }
    const foundLib = installedLibs.find(lib => lib.opencvModule === opencvModule)
    hasLibs = hasLibs && !!foundLib
    log.info('install', 'lib %s: %s', opencvModule, foundLib ? foundLib.libPath : 'not found')
  })

  return hasLibs
}

export async function install(ctxt?: BuildContext): Promise<void>{
  if (!ctxt)
    ctxt = new BuildContext();
  // if project directory has a package.json containing opencv4nodejs variables
  // apply these variables to the process environment
  env.applyEnvsFromPackageJson()

  if (env.isAutoBuildDisabled()) {
    log.info('install', `${highlight('OPENCV4NODEJS_DISABLE_AUTOBUILD')} is set skipping auto build...`)
    return
  }
  log.info('install', `if you want to use an own OpenCV installation set ${highlight('OPENCV4NODEJS_DISABLE_AUTOBUILD')}`)

  // prevent rebuild on every install
  const autoBuildFile = ctxt.readAutoBuildFile()
  if (autoBuildFile) {
    log.info('install', `found auto-build.json: ${highlight(ctxt.autoBuildFile)}`)

    if (autoBuildFile.opencvVersion !== ctxt.opencvVersion) {
      // can no longer occure with this version of opencv4nodejs-builder
      log.info('install', `auto build opencv version is ${autoBuildFile.opencvVersion}, but OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION=${ctxt.opencvVersion}`)
    } else if (autoBuildFile.autoBuildFlags !== env.autoBuildFlags()) {
      // should no longer occure since -MD5(autoBuildFlags) is append to build path
      log.info('install', `auto build flags are ${autoBuildFile.autoBuildFlags}, but OPENCV4NODEJS_AUTOBUILD_FLAGS=${env.autoBuildFlags()}`)
    } else {
      const hasLibs = checkInstalledLibs(ctxt, autoBuildFile)
      if (hasLibs) {
        log.info('install', `all libraries are installed in ${highlight(ctxt.opencvLibDir)} => ${highlight('Skip')} building`)
        return
      } else {
        log.info('install', 'missing some libraries')
      }
    }
  } else {
    log.info('install', `failed to find auto-build.json: ${ctxt.autoBuildFile}`)
  }

  log.info('install', '')
  log.info('install', 'running install script...')
  log.info('install', '')
  log.info('install', 'opencv version: %s', ctxt.opencvVersion)
  log.info('install', 'with opencv contrib: %s', env.isWithoutContrib() ? 'no' : 'yes')
  log.info('install', 'custom build flags: %s', env.autoBuildFlags())
  log.info('install', '')

  try {
    await requireGit()
    await requireCmake()
    await setupOpencv(ctxt)
  } catch (err) {
    if (err.toString)
      log.error('install', err.toString())
    else
      log.error('install', JSON.stringify(err))
    process.exit(1)
  }
}
