const { exec, spawn, isWin } = require('./utils')
const findMsBuild = require('./find-msbuild')
const {
  rootDir,
  opencvRoot,
  opencvSrc,
  opencvContribSrc,
  opencvContribModules,
  opencvBuild,
  opencvLocalLib
} = require('../constants')

const tag = '3.4.0'

function getIfExistsDirCmd(dirname, exists = true) {
  return isWin() ? `if ${!exists ? 'not ' : ''}exist ${dirname}` : ''
}

function getMkDirCmd(dirname) {
  return isWin() ? `${getIfExistsDirCmd(dirname, false)} mkdir ${dirname}` : `mkdir -p ${dirname}`
}

function getRmDirCmd(dirname) {
  return isWin() ? `${getIfExistsDirCmd(dirname)} rd /s /q ${dirname}` : `rm -rf ${dirname}`
}

function getMsbuildCmd(sln) {
  return [
    sln,
    '/p:Configuration=Release',
    `/p:Platform=${process.arch === 'x64' ? 'x64' : 'x86'}`
  ]
}

function getRunBuildCmd(msbuildExe) {
  if (msbuildExe) {
    return () => spawn(`${msbuildExe}`, getMsbuildCmd('./OpenCV.sln'), { cwd: opencvBuild })
      .then(() => spawn(`${msbuildExe}`, getMsbuildCmd('./INSTALL.vcxproj'), { cwd: opencvBuild }))
  }
  return () => spawn('make', ['all'], { cwd: opencvBuild })
}

const cmakeVsCompilers = {
  '10': 'Visual Studio 10 2010',
  '11': 'Visual Studio 11 2012',
  '12': 'Visual Studio 12 2013',
  '14': 'Visual Studio 14 2015',
  '15': 'Visual Studio 15 2017'
}

const cmakeArchs = {
  'x64': ' Win64',
  'ia32': '',
  'arm': ' ARM'
}

function getSharedCmakeFlags() {
  return [
    `-DCMAKE_INSTALL_PREFIX=${opencvBuild}`,
    '-DCMAKE_BUILD_TYPE=Release ',
    `-DOPENCV_EXTRA_MODULES_PATH=${opencvContribModules}`,
    '-DBUILD_EXAMPLES=OFF',
    '-DBUILD_TESTS=OFF',
    '-DBUILD_PERF_TESTS=OFF'
  ]
}

function getWinCmakeFlags(msversion) {
  return [
    '-G',
    `${cmakeVsCompilers[msversion]}${cmakeArchs[process.arch]}`
  ].concat(getSharedCmakeFlags())
}

function getCmakeArgs(cmakeFlags) {
  return [opencvSrc].concat(cmakeFlags)
}

function getMsbuildIfWin() {
  return isWin() ? findMsBuild() : Promise.resolve()
}

module.exports = function() {
  const opencvRepo = 'https://github.com/opencv/opencv.git'
  const opencvContribRepo = 'https://github.com/opencv/opencv_contrib.git'

  return getMsbuildIfWin().then(msbuild =>
    exec(getMkDirCmd('opencv'), { cwd: rootDir })
      .then(() => exec(getMkDirCmd('build'), { cwd: opencvRoot }))
      .then(() => exec(getRmDirCmd('opencv_contrib'), { cwd: opencvRoot }))
      .then(() => spawn('git', ['clone', '--progress', opencvContribRepo], { cwd: opencvRoot }))
      .then(() => spawn('git', ['checkout', `tags/${tag}`, '-b', `v${tag}`], { cwd: opencvContribSrc }))
      .then(() => exec(getRmDirCmd('opencv'), { cwd: opencvRoot }))
      .then(() => spawn('git', ['clone', '--progress', opencvRepo], { cwd: opencvRoot }))
      .then(() => spawn('git', ['checkout', `tags/${tag}`, '-b', `v${tag}`], { cwd: opencvSrc }))
      .then(() => spawn('cmake', getCmakeArgs(isWin() ? getWinCmakeFlags(msbuild.version) : getSharedCmakeFlags()), { cwd: opencvBuild }))
      .then(getRunBuildCmd(isWin() ? msbuild.path : undefined))
  )
}