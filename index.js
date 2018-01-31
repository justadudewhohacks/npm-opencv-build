const getLibs = require('./libs')
const {
  opencvInclude,
  opencvBinDir,
  opencvModules
} = require('./constants')

const {
  isWin,
  hasSelfBuild
} = require('./install/utils')

function includes() {
  if (hasSelfBuild()) {
    return
  }

  console.log(opencvInclude)
}

function libraries() {
  if (hasSelfBuild()) {
    return
  }

  getLibs().map(lib => lib.libPath).forEach(lib => console.log(lib))
}

function ensureBinaries() {
  if (!isWin() || hasSelfBuild()) {
    return
  }

  // append opencv binary path to node process
  if (!process.env.path.includes(opencvBinDir)) {
    process.env.path = `${process.env.path};${opencvBinDir};`
  }
}

module.exports = {
  includes,
  libraries,
  ensureBinaries,
  opencvModules,
  hasSelfBuild
}