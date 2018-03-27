const { expect } = require('chai')
const { opencvModules } = require('../constants')
const createGetLibs = require('../libs')

function createFake(libFiles, { isWin, isOSX } = { isWin: false, isOSX: false }) {
  const fs = {
    existsSync: () => true,
    realpathSync: p => p,
    readdirSync: () => libFiles
  }
  const path = {
    resolve: (dir, file) => file
  }
  const utils = {
    opencvModules,
    isWin: () => isWin,
    isOSX: () => isOSX,
  }
  return createGetLibs(Object.assign({}, utils, { fs, path }))
}

describe('libs', () => {

  it('should find world .lib', () => {
    const worldLibFile = 'opencv_world340.lib'
    const libFiles = [
      worldLibFile
    ]

    const getLibs = createFake(libFiles, { isWin: true })
    const res = getLibs()
    expect(res).to.be.an('array').lengthOf(1)
    expect(res[0].opencvModule).to.equal('world')
    expect(res[0].libPath).to.equal(worldLibFile)
  })

  it('should find world .so', () => {
    const worldLibFile = 'libopencv_world.so'
    const libFiles = [
      worldLibFile
    ]

    const getLibs = createFake(libFiles)
    const res = getLibs()
    expect(res).to.be.an('array').lengthOf(1)
    expect(res[0].opencvModule).to.equal('world')
    expect(res[0].libPath).to.equal(worldLibFile)
  })

  it('should find world .dylib', () => {
    const worldLibFile = 'libopencv_world.dylib'
    const libFiles = [
      worldLibFile
    ]

    const getLibs = createFake(libFiles, { isOSX: true })
    const res = getLibs()
    expect(res).to.be.an('array').lengthOf(1)
    expect(res[0].opencvModule).to.equal('world')
    expect(res[0].libPath).to.equal(worldLibFile)
  })

  it('should find opencv .lib files', () => {
    const coreLibFile = 'opencv_core340.lib'
    const libFiles = [
      coreLibFile
    ]

    const getLibs = createFake(libFiles, { isWin: true })
    const res = getLibs()
    expect(res).to.be.an('array').lengthOf(opencvModules.length)
    expect(res.some(({ opencvModule }) => opencvModule === 'core'))
    expect(res.find(l => l.opencvModule === 'core')).to.have.property('libPath').to.equal(coreLibFile)
  })

  it('should find opencv .so files', () => {
    const coreLibFile = 'libopencv_core.so'
    const libFiles = [
      coreLibFile
    ]

    const getLibs = createFake(libFiles)
    const res = getLibs()
    expect(res).to.be.an('array').lengthOf(opencvModules.length)
    expect(res.some(({ opencvModule }) => opencvModule === 'core'))
    expect(res.find(l => l.opencvModule === 'core')).to.have.property('libPath').to.equal(coreLibFile)
  })

  it('should find opencv .dylib files', () => {
    const coreLibFile = 'libopencv_core.dylib'
    const libFiles = [
      coreLibFile
    ]

    const getLibs = createFake(libFiles, { isOSX: true })
    const res = getLibs()
    expect(res).to.be.an('array').lengthOf(opencvModules.length)
    expect(res.some(({ opencvModule }) => opencvModule === 'core'))
    expect(res.find(l => l.opencvModule === 'core')).to.have.property('libPath').to.equal(coreLibFile)
  })

  it('should only link .lib files with exact name match', () => {
    const objdetectLibFile = 'opencv_objdetect340.lib'
    const dnnObjdetectLibFile = 'opencv_dnn_objdetect340.lib'
    const libFiles = [
      objdetectLibFile,
      dnnObjdetectLibFile
    ]

    const getLibs = createFake(libFiles, { isWin: true })
    const res = getLibs()
    expect(res).to.be.an('array').lengthOf(opencvModules.length)
    expect(res.some(({ opencvModule }) => opencvModule === 'objdetect'))
    expect(res.find(l => l.opencvModule === 'objdetect')).to.have.property('libPath').to.equal(objdetectLibFile)
    expect(res.some(({ libPath }) => libPath === dnnObjdetectLibFile)).to.be.false
  })

  it('should only link .so files with exact name match', () => {
    const objdetectLibFile = 'libopencv_objdetect.so'
    const dnnObjdetectLibFile = 'libopencv_dnn_objdetect.so'
    const libFiles = [
      objdetectLibFile,
      dnnObjdetectLibFile
    ]

    const getLibs = createFake(libFiles)
    const res = getLibs()
    expect(res).to.be.an('array').lengthOf(opencvModules.length)
    expect(res.some(({ opencvModule }) => opencvModule === 'objdetect'))
    expect(res.find(l => l.opencvModule === 'objdetect')).to.have.property('libPath').to.equal(objdetectLibFile)
    expect(res.some(({ libPath }) => libPath === dnnObjdetectLibFile)).to.be.false
  })

  it('should only link .dylib files with exact name match', () => {
    const objdetectLibFile = 'libopencv_objdetect.dylib'
    const dnnObjdetectLibFile = 'libopencv_dnn_objdetect.dylib'
    const libFiles = [
      objdetectLibFile,
      dnnObjdetectLibFile
    ]

    const getLibs = createFake(libFiles, { isOSX: true })
    const res = getLibs()
    expect(res).to.be.an('array').lengthOf(opencvModules.length)
    expect(res.some(({ opencvModule }) => opencvModule === 'objdetect'))
    expect(res.find(l => l.opencvModule === 'objdetect')).to.have.property('libPath').to.equal(objdetectLibFile)
    expect(res.some(({ libPath }) => libPath === dnnObjdetectLibFile)).to.be.false
  })

})