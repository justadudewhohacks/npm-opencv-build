import * as fs from 'fs';
import * as path from 'path';

import { dirs } from './dirs';
import { opencvModules } from './constants';
import { isAutoBuildDisabled } from './env';
import { getLibsFactory } from './getLibsFactory';
import { setupOpencv } from './setupOpencv';
import { isOSX, isWin, requireCmake, requireGit } from './utils';

const log = require('npmlog')

const getLibs = getLibsFactory({ isWin, isOSX, opencvModules, path, fs })

export async function install() {
  if (isAutoBuildDisabled()) {
    log.info('install', 'OPENCV4NODEJS_DISABLE_AUTOBUILD is set')
    log.info('install', 'skipping auto build...')
    return
  }
  log.info('install', 'if you want to use an own OpenCV installation set OPENCV4NODEJS_DISABLE_AUTOBUILD')

  // prevent rebuild on every install
  if (fs.existsSync(dirs.opencvLibDir)) {
    let hasLibs = true

    log.info('install', `found opencv library dir: ${dirs.opencvLibDir}`)
    log.info('install', 'checking for opencv libraries')
    getLibs(dirs.opencvLibDir).forEach((lib) => {
      hasLibs = hasLibs && !!lib.libPath
      log.info('install', '%s: %s', lib.opencvModule, lib.libPath || 'not found')
    })

    if (hasLibs) {
      log.info('install', 'found all libraries')
      return
    } else {
      log.info('install', 'missing some libraries')
    }
  } else {
    log.info('install', `library dir does not exist: ${dirs.opencvLibDir}`)
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
