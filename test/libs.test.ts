import { OpenCVBuildEnv, OpenCVBuildEnvParams, OpenCVBuilder } from '../lib/index'
import chai, { expect } from 'chai'
import path from 'path';

chai.use(require('chai-string'));

export class FakeOpenCVBuildEnv extends OpenCVBuildEnv {
  constructor(opts: OpenCVBuildEnvParams) {
    super(opts);
  }

  public setPlatform(platform: NodeJS.Platform) {
      super._platform = platform;
  }
}

describe('libs', () => {
  const env = new FakeOpenCVBuildEnv({prebuild: 'latestBuild'});
  const builder = new OpenCVBuilder(env);
  builder.getLibs.syncPath = false;
  const opencvModules = builder.env.enabledModules;

  it('should find world .lib (win) Fullpath test', () => {
    const libFiles = [ 'opencv_world340.lib' ]
    env.setPlatform('win32')
    builder.getLibs.libFiles = libFiles;
    const res = builder.getLibs.getLibs();
    expect(res).to.be.an('array').lengthOf(1)
    expect(res[0].opencvModule).to.equal('world')
    expect(res[0].libPath).to.equal(path.join(env.opencvLibDir, libFiles[0]))
  })
 
  it('should find world .so (unix)', () => {
    const libFiles = [ 'libopencv_world.so' ]
    env.setPlatform('linux')
    builder.getLibs.libFiles = libFiles;
    const res = builder.getLibs.getLibs();
    expect(res).to.be.an('array').lengthOf(1)
    expect(res[0].opencvModule).to.equal('world')
    expect(res[0].libPath).to.endWith(libFiles[0])
  })

  it('should find world .dylib (osX)', () => {
    const libFiles = [ 'libopencv_world.dylib' ]
    env.setPlatform('darwin')
    builder.getLibs.libFiles = libFiles;
    const res = builder.getLibs.getLibs();
    expect(res).to.be.an('array').lengthOf(1)
    expect(res[0].opencvModule).to.equal('world')
    expect(res[0].libPath).to.endWith(libFiles[0])
  })

  it('should find opencv .lib files', () => {
    const coreLibFile = 'opencv_core340.lib'
    const libFiles = [
      coreLibFile
    ]
    //const getLibs = createFake(libFiles, { isWin: true })
    env.setPlatform('win32')
    builder.getLibs.libFiles = libFiles;
    const res = builder.getLibs.getLibs()
    expect(res).to.be.an('array').lengthOf(opencvModules.length)
    expect(res.some(({ opencvModule }) => opencvModule === 'core'))
    expect(res.find(l => l.opencvModule === 'core')).to.have.property('libPath').to.endWith(coreLibFile)
  })

  it('should find opencv .so files', () => {
    const coreLibFile = 'libopencv_core.so'
    const libFiles = [
      coreLibFile
    ]
    env.setPlatform('linux')
    builder.getLibs.libFiles = libFiles;
    const res = builder.getLibs.getLibs()
    expect(res).to.be.an('array').lengthOf(opencvModules.length)
    expect(res.some(({ opencvModule }) => opencvModule === 'core'))
    expect(res.find(l => l.opencvModule === 'core')).to.have.property('libPath').to.endWith(coreLibFile)
  })
  
  it('should find opencv .dylib files', () => {
    const coreLibFile = 'libopencv_core.dylib'
    const libFiles = [
      coreLibFile
    ]
    env.setPlatform('darwin')
    builder.getLibs.libFiles = libFiles;
    const res = builder.getLibs.getLibs()
    expect(res).to.be.an('array').lengthOf(opencvModules.length)
    expect(res.some(({ opencvModule }) => opencvModule === 'core'))
    expect(res.find(l => l.opencvModule === 'core')).to.have.property('libPath').to.endWith(coreLibFile)
  })

  it('should only link .lib files with exact name match', () => {
    const objdetectLibFile = 'opencv_objdetect340.lib'
    const dnnObjdetectLibFile = 'opencv_dnn_objdetect340.lib'
    const libFiles = [
      objdetectLibFile,
      dnnObjdetectLibFile
    ]
    env.setPlatform('win32')
    builder.getLibs.libFiles = libFiles;
    const res = builder.getLibs.getLibs()
    expect(res).to.be.an('array').lengthOf(opencvModules.length)
    expect(res.some(({ opencvModule }) => opencvModule === 'objdetect'))
    expect(res.find(l => l.opencvModule === 'objdetect')).to.have.property('libPath').to.endWith(objdetectLibFile)
    expect(res.some(({ libPath }) => libPath === dnnObjdetectLibFile)).to.be.false
  })

  it('should only link .so files with exact name match', () => {
    const objdetectLibFile = 'libopencv_objdetect.so'
    const dnnObjdetectLibFile = 'libopencv_dnn_objdetect.so'
    const libFiles = [
      objdetectLibFile,
      dnnObjdetectLibFile
    ]
    env.setPlatform('linux')
    builder.getLibs.libFiles = libFiles;
    const res = builder.getLibs.getLibs()
    expect(res).to.be.an('array').lengthOf(opencvModules.length)
    expect(res.some(({ opencvModule }) => opencvModule === 'objdetect'))
    expect(res.find(l => l.opencvModule === 'objdetect')).to.have.property('libPath').to.endWith(objdetectLibFile)
    expect(res.some(({ libPath }) => libPath === dnnObjdetectLibFile)).to.be.false
  })

  it('should only link .dylib files with exact name match', () => {
    const objdetectLibFile = 'libopencv_objdetect.dylib'
    const dnnObjdetectLibFile = 'libopencv_dnn_objdetect.dylib'
    const libFiles = [
      objdetectLibFile,
      dnnObjdetectLibFile
    ]
    env.setPlatform('darwin')
    builder.getLibs.libFiles = libFiles;
    const res = builder.getLibs.getLibs()
    expect(res).to.be.an('array').lengthOf(opencvModules.length)
    expect(res.some(({ opencvModule }) => opencvModule === 'objdetect'))
    expect(res.find(l => l.opencvModule === 'objdetect')).to.have.property('libPath').to.endWith(objdetectLibFile)
    expect(res.some(({ libPath }) => libPath === dnnObjdetectLibFile)).to.be.false
  })
})