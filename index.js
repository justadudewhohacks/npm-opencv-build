const path = require('path')
const fs = require('fs')
const { isWin, isOSX } = require('./install/utils')
const {
  opencvInclude,
  opencvLibDir,
  opencvBinDir,
  opencvModules
} = require('./constants')
const getLibs = require('./libs')({ isWin, isOSX, opencvModules, path, fs })

const {
  isAutoBuildDisabled
} = require('./install/utils')

module.exports = {
  opencvInclude,
  opencvLibDir,
  opencvBinDir,
  getLibs,
  opencvModules,
  isAutoBuildDisabled
}