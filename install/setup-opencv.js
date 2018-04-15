const log = require('npmlog')
const { exec, spawn, isWin } = require('./utils')
const findMsBuild = require('./find-msbuild')
const {
  rootDir,
  opencvRoot,
  opencvSrc,
  opencvContribSrc,
  opencvContribModules,
  opencvBuild,
  opencvLocalLib,
  numberOfCoresAvailable
} = require('../constants')

const tag = '3.4.1'

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
  return () => spawn('make', ['install', `-j${numberOfCoresAvailable}`], { cwd: opencvBuild })
    // revert the strange archiving of libopencv.so going on with make install
    .then(() => spawn('make', ['all', `-j${numberOfCoresAvailable}`], { cwd: opencvBuild }))
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
    '-DCMAKE_BUILD_TYPE=Release',
    `-DOPENCV_EXTRA_MODULES_PATH=${opencvContribModules}`,
    '-DBUILD_EXAMPLES=OFF',
    '-DBUILD_DOCS=OFF',
    '-DBUILD_TESTS=OFF',
    '-DBUILD_PERF_TESTS=OFF',
    '-DBUILD_JAVA=OFF',
    '-DBUILD_opencv_apps=OFF',
    '-DBUILD_opencv_aruco=OFF',
    '-DBUILD_opencv_bgsegm=OFF',
    '-DBUILD_opencv_bioinspired=OFF',
    '-DBUILD_opencv_ccalib=OFF',
    '-DBUILD_opencv_datasets=OFF',
    '-DBUILD_opencv_dnn_objdetect=OFF',
    '-DBUILD_opencv_dpm=OFF',
    '-DBUILD_opencv_fuzzy=OFF',
    '-DBUILD_opencv_hfs=OFF',
    '-DBUILD_opencv_java_bindings_generator=OFF',
    '-DBUILD_opencv_js=OFF',
    '-DBUILD_opencv_img_hash=OFF',
    '-DBUILD_opencv_line_descriptor=OFF',
    '-DBUILD_opencv_optflow=OFF',
    '-DBUILD_opencv_phase_unwrapping=OFF',
    '-DBUILD_opencv_python3=OFF',
    '-DBUILD_opencv_python_bindings_generator=OFF',
    '-DBUILD_opencv_reg=OFF',
    '-DBUILD_opencv_rgbd=OFF',
    '-DBUILD_opencv_saliency=OFF',
    '-DBUILD_opencv_shape=OFF',
    '-DBUILD_opencv_stereo=OFF',
    '-DBUILD_opencv_stitching=OFF',
    '-DBUILD_opencv_structured_light=OFF',
    '-DBUILD_opencv_superres=OFF',
    '-DBUILD_opencv_surface_matching=OFF',
    '-DBUILD_opencv_ts=OFF',
    '-DBUILD_opencv_xobjdetect=OFF',
    '-DBUILD_opencv_xphoto=OFF',
    '-DWITH_VTK=OFF'
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
  return isWin()
    ? findMsBuild()
      .then((msbuild) => {
        log.info('install', 'using msbuild:', msbuild)
        return msbuild
      })
    : Promise.resolve()
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
