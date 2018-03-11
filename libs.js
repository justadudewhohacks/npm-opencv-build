const fs = require('fs')
const path = require('path')
const {
  opencvModules,
  opencvLibDir
} = require('./constants')
const {
  isWin,
  isOSX,
  isUnix
} = require('./install/utils')

const libPrefix = 'libopencv_';
const worldModule = 'world';

function checkPrefix(file) {
  return isWin() || file.startsWith(libPrefix)
}

function getLibSuffix() {
  return process.platform === 'win32' ? '.lib' : (process.platform === 'darwin' ? '.dylib' : '.so')
}

function isLibFile(file) {
  return checkPrefix(file) && file.endsWith(getLibSuffix())
}

function makeGetLibAbsPath(libDir) {
  return libFile => (!!libFile ? path.resolve(libDir, libFile) : undefined)
}

function findAnyIncludes(all, str) {
  return all.find(el => el.includes(str))
}

module.exports = function (libDir) {
  if (!fs.existsSync(libDir)) {
    throw new Error(`specified lib dir does not exist: ${libDir}`)
  }

  const libFiles = fs.readdirSync(libDir)
    .filter(isLibFile)
    // dirty fix to prevent linking dnn_objdetect instead of dnn (since 3.4.1)
    .filter(file => !file.includes('dnn_objdetect'))

  const getLibAbsPath = makeGetLibAbsPath(libDir)

  const worldLibPath = findAnyIncludes(libFiles, worldModule)
  if (worldLibPath) {
    return ({
      opencvModule: worldModule,
      libPath: getLibAbsPath(worldLibPath)
    })
  }

  return opencvModules.map(
    opencvModule => ({
      opencvModule,
      libPath: getLibAbsPath(findAnyIncludes(libFiles, opencvModule))
    })
  )
}