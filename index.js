const path = require('path')
const getLibs = require('./libs')
const {
  opencvInclude,
  opencvLibDir,
  opencvBinDir,
  opencvModules
} = require('./constants')
const {
  hasSelfBuild
} = require('./install/utils')

module.exports = {
  opencvInclude,
  getLibs,
  opencvModules,
  hasSelfBuild
}