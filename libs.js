const fs = require('fs')
const path = require('path')
const { opencvLibDir, opencvModules } = require('./constants')

const libSuffix = process.platform === 'win32' ? '.lib' : (process.platform === 'darwin' ? '.dylib' : '.so')

function getLibPath(libFile) {
  return !!libFile ? path.resolve(opencvLibDir, libFile) : undefined
}

module.exports = function () {
  const libFiles = fs.existsSync(opencvLibDir)
    ? fs.readdirSync(opencvLibDir).filter(libFile => libFile.endsWith(libSuffix))
    : []

  return opencvModules.map(
    opencvModule => ({
      opencvModule,
      libPath: getLibPath(libFiles.find(libFile => libFile.includes(opencvModule)))
    })
  )
}