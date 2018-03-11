const path = require('path')
const getLibs = require('./libs')
const {
  opencvInclude,
  opencvLibDir,
  opencvBinDir,
  opencvModules
} = require('./constants')
const {
  isAutoBuildDisabled
} = require('./install/utils')

module.exports = {
  opencvInclude,
  opencvBinDir,
  getLibs,
  opencvModules,
  isAutoBuildDisabled
}