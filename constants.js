const path = require('path')
const os = require('os');

const { isWin } = require('./install/utils')

const rootDir = __dirname
const opencvRoot = path.join(rootDir, 'opencv')
const opencvSrc = path.join(opencvRoot, 'opencv')
const opencvContribSrc = path.join(opencvRoot, 'opencv_contrib')
const opencvContribModules = path.join(opencvContribSrc, 'modules')
const opencvBuild = path.join(opencvRoot, 'build')
const opencvInclude = path.join(opencvBuild, 'include')
const opencvLibDir = isWin() ? path.join(opencvBuild, 'lib/Release') : path.join(opencvBuild, 'lib')
const opencvBinDir = isWin() ? path.join(opencvBuild, 'bin/Release') : path.join(opencvBuild, 'bin')

const numberOfCoresAvailable = os.cpus().length

const opencvModules = [
  'core',
  'highgui',
  'imgcodecs',
  'imgproc',
  'features2d',
  'calib3d',
  'photo',
  'objdetect',
  'ml',
  'video',
  'videoio',
  'videostab',
  'dnn',
  'face',
  'text',
  'tracking',
  'xfeatures2d',
  'ximgproc'
]

module.exports = {
  rootDir,
  opencvRoot,
  opencvSrc,
  opencvContribSrc,
  opencvContribModules,
  opencvBuild,
  opencvInclude,
  opencvLibDir,
  opencvBinDir,
  opencvModules,
  numberOfCoresAvailable
}