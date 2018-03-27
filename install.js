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
} = require('./install/utils')
const setupOpencv = require('./install/setup-opencv')

function install() {
  log.silly('install', 'install')
  if (isAutoBuildDisabled()) {
    log.info('install', 'OPENCV4NODEJS_DISABLE_AUTOBUILD is set')
    log.info('install', 'skipping auto build...')
    return
  }
  log.info('install', 'if you want to use an own OpenCV installation set OPENCV4NODEJS_DISABLE_AUTOBUILD')
  log.info('install', 'running install script...')

  // prevent rebuild on every install
  if (fs.existsSync(opencvLibDir)) {
    let hasLibs = true

    log.silly('install', 'checking opencv libraries')
    getLibs().forEach((lib) => {
      hasLibs = hasLibs && !!lib.libPath
      log.silly('install', '%s: %s', lib.opencvModule, lib.libPath || 'not found')
    })

    if (hasLibs) {
      log.silly('install', 'found all libraries')
      return
    }
  }

  log.silly('install', 'installing opencv')
  return requireGit()
    .then(requireCmake)
    .then(setupOpencv)
    .catch((err) => {
      log.error(err)
      process.exit(1)
    })
}

install()