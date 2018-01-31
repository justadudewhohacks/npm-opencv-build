const getLibs = require('./libs')
const {
  opencvInclude,
  opencvBinDir
} = require('./constants')

const {
  hasSelfBuild,
  isWin
} = require('./install/utils')

function includes() {
  console.log(opencvInclude)
}

function libraries() {
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
  ensureBinaries
}