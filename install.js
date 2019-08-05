if (process.env.npm_config_loglevel === 'silly') {
  log.level = 'silly'
}

const { install } = require('./build/install')
  , {resolve} = require('path')
  , rootPackageJSON = require(resolve(process.env.INIT_CWD, 'package.json'))

if (rootPackageJSON.opencv4nodejs &&
  rootPackageJSON.opencv4nodejs.flags) {

  if (process.env.OPENCV4NODEJS_AUTOBUILD_FLAGS) {

    process.env.OPENCV4NODEJS_AUTOBUILD_FLAGS = [
      process.env.OPENCV4NODEJS_AUTOBUILD_FLAGS,
      rootPackageJSON.opencv4nodejs.flags
    ].join(' ')
  } else {

    process.env.OPENCV4NODEJS_AUTOBUILD_FLAGS = rootPackageJSON.opencv4nodejs.flags
  }
}

install()
