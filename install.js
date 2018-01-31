const fs = require('fs')

const getLibs = require('./libs')
const { requireGit, requireCmake, hasSelfBuild } = require('./install/utils')
const setupOpencv = require('./install/setup-opencv')

function install() {
  console.log('install')
  if (hasSelfBuild()) {
    console.log('OPENCV4NODEJS_DISABLE_AUTOBUILD is set')
    console.log('skipping auto build...')
    return
  }
  console.log('if you want to use an own OpenCV installation set OPENCV4NODEJS_DISABLE_AUTOBUILD')
  console.log('running install script...')

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