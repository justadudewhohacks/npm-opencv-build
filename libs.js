const fs = require('fs')
const path = require('path')
const { opencvLibDir, opencvModules } = require('./constants')

const libSuffix = process.platform === 'win32' ? '.lib' : (process.platform === 'darwin' ? '.dylib' : '.so')

function getLibPath(libFile) {
  return !!libFile ? path.resolve(opencvLibDir, libFile) : undefined
}

module.exports = function () {
  const libFiles = fs.existsSync(opencvLibDir)
    ? fs.readdirSync(opencvLibDir)
      .filter(libFile => libFile.endsWith(libSuffix))
      // dirty fix to prevent linking dnn_objdetect instead of dnn (since 3.4.1)
      .filter(file => !file.includes('dnn_objdetect'))
    : []

  return opencvModules.map(
    opencvModule => ({
      opencvModule,
      libPath: getLibPath(libFiles.find(libFile => libFile.includes(opencvModule)))
    })
  )
}