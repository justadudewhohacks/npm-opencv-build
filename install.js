const fs = require('fs')

const getLibs = require('./libs')
const { requireGit, requireCmake, hasSelfBuild } = require('./install/utils')
const setupOpencv = require('./install/setup-opencv')

function install() {
  if (hasSelfBuild()) {
    console.log('found opencv')
    console.log('OPENCV_INCLUDE_DIR:', process.env.OPENCV_INCLUDE_DIR)
    console.log('OPENCV_LIB_DIR:', process.env.OPENCV_LIB_DIR)
    return
  }
  console.log('did not find OPENCV_INCLUDE_DIR && OPENCV_LIB_DIR')
  console.log('running install script')

  // prevent rebuild on every install
  let hasLibs = true
  console.log('checking opencv libraries')
  getLibs().forEach((lib) => {
    hasLibs = hasLibs && !!lib.libPath
    console.log('%s: %s', lib.opencvModule, lib.libPath || 'not found')
  })

  if (hasLibs) {
    console.log('found all libraries')
    return
  }

  console.log('installing opencv')
  return requireGit()
    .then(requireCmake)
    .then(setupOpencv)
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}

install()