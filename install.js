const path = require('path')
const fs = require('fs')
const log = require('npmlog')

if (process.env.npm_config_loglevel === 'silly') {
  log.level = 'silly'
}

const {
  opencvModules
} = require('./constants')
const {
  isWin,
  isOSX,
  requireGit,
  requireCmake,
  isAutoBuildDisabled
} = require('./install/utils')

const getLibs = require('./libs')({ isWin, isOSX, opencvModules, path, fs })

const {
  opencvLibDir
} = require('./constants')
const setupOpencv = require('./install/setup-opencv')

function install() {
  if (isAutoBuildDisabled()) {
    log.info('install', 'OPENCV4NODEJS_DISABLE_AUTOBUILD is set')
    log.info('install', 'skipping auto build...')
    return
  }
  log.info('install', 'if you want to use an own OpenCV installation set OPENCV4NODEJS_DISABLE_AUTOBUILD')

  // prevent rebuild on every install
  if (fs.existsSync(opencvLibDir)) {
    let hasLibs = true

    log.info('install', `found opencv library dir: ${opencvLibDir}`)
    log.info('install', 'checking for opencv libraries')
    getLibs(opencvLibDir).forEach((lib) => {
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
    log.info('install', `library dir does not exist: ${opencvLibDir}`)
  }

  log.info('install', 'running install script...')
  return requireGit()
    .then(requireCmake)
    .then(setupOpencv)
    .catch((err) => {
      log.error(err)
      process.exit(1)
    })
}

install()
