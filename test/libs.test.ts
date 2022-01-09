import { OpenCVBuildEnv, OpenCVBuildEnvParams } from '../lib/BuildEnv'
import { OpenCVBuilder } from '../lib/OpenCVBuilder'
import { expect } from 'chai'
import fs from 'fs';
import path from 'path';

export class FakeOpenCVBuildEnv extends OpenCVBuildEnv {
  constructor(opts: OpenCVBuildEnvParams, os: 'win' | 'osX' | 'unix') {
    super(opts);
    this.setOs(os)
  }

  public setOs(os: 'win' | 'osX' | 'unix') {
    if (os == 'win') {
      super._isWindows = true;
      super._isOsX = false;
    }
    else if (os == 'osX') {
      super._isWindows = false;
      super._isOsX = true;
    }
    else if (os == 'unix') {
      super._isWindows = false;
      super._isOsX = false;
    }
  }
}

describe('libs', () => {
  const root = __dirname;
  const env = new FakeOpenCVBuildEnv({}, 'win');
  const builder = new OpenCVBuilder(env);

  it('should find world .lib (win)', () => {
    const worldLibFile = 'opencv_world340.lib'
    const fp = path.join(root, worldLibFile);
    fs.closeSync(fs.openSync(path.join(root, worldLibFile), 'w'));
    const libFiles = [
      worldLibFile
    ]
    env.setOs('win')
    const res = builder.getLibs.matchLib('world', root, libFiles);
    expect(res).to.eq(fp)
    fs.unlinkSync(fp)
  })
 
  it('should find world .so (unix)', () => {
    const worldLibFile = 'libopencv_world.so'
    const fp = path.join(root, worldLibFile);
    fs.closeSync(fs.openSync(path.join(root, worldLibFile), 'w'));
    const libFiles = [
      worldLibFile
    ]
    env.setOs('unix')
    const res = builder.getLibs.matchLib('world', root, libFiles);
    expect(res).to.eq(fp)
    fs.unlinkSync(fp)
  })

  it('should find world .dylib (osX)', () => {
    const worldLibFile = 'libopencv_world.dylib'
    const fp = path.join(root, worldLibFile);
    fs.closeSync(fs.openSync(path.join(root, worldLibFile), 'w'));
    const libFiles = [
      worldLibFile
    ]
    env.setOs('osX')
    const res = builder.getLibs.matchLib('world', root, libFiles);
    expect(res).to.eq(fp)
    fs.unlinkSync(fp)
  })

  // it('should find opencv .lib files', () => {
  //   const coreLibFile = 'opencv_core340.lib'
  //   const libFiles = [
  //     coreLibFile
  //   ]
  //   const getLibs = createFake(libFiles, { isWin: true })
  //   const res = getLibs()
  //   expect(res).to.be.an('array').lengthOf(opencvModules.length)
  //   expect(res.some(({ opencvModule }) => opencvModule === 'core'))
  //   expect(res.find(l => l.opencvModule === 'core')).to.have.property('libPath').to.equal(coreLibFile)
  // })
  // it('should find opencv .so files', () => {
  //   const coreLibFile = 'libopencv_core.so'
  //   const libFiles = [
  //     coreLibFile
  //   ]
  //   const getLibs = createFake(libFiles)
  //   const res = getLibs()
  //   expect(res).to.be.an('array').lengthOf(opencvModules.length)
  //   expect(res.some(({ opencvModule }) => opencvModule === 'core'))
  //   expect(res.find(l => l.opencvModule === 'core')).to.have.property('libPath').to.equal(coreLibFile)
  // })
  // it('should find opencv .dylib files', () => {
  //   const coreLibFile = 'libopencv_core.dylib'
  //   const libFiles = [
  //     coreLibFile
  //   ]
  //   const getLibs = createFake(libFiles, { isOSX: true })
  //   const res = getLibs()
  //   expect(res).to.be.an('array').lengthOf(opencvModules.length)
  //   expect(res.some(({ opencvModule }) => opencvModule === 'core'))
  //   expect(res.find(l => l.opencvModule === 'core')).to.have.property('libPath').to.equal(coreLibFile)
  // })
  // it('should only link .lib files with exact name match', () => {
  //   const objdetectLibFile = 'opencv_objdetect340.lib'
  //   const dnnObjdetectLibFile = 'opencv_dnn_objdetect340.lib'
  //   const libFiles = [
  //     objdetectLibFile,
  //     dnnObjdetectLibFile
  //   ]
  //   const getLibs = createFake(libFiles, { isWin: true })
  //   const res = getLibs()
  //   expect(res).to.be.an('array').lengthOf(opencvModules.length)
  //   expect(res.some(({ opencvModule }) => opencvModule === 'objdetect'))
  //   expect(res.find(l => l.opencvModule === 'objdetect')).to.have.property('libPath').to.equal(objdetectLibFile)
  //   expect(res.some(({ libPath }) => libPath === dnnObjdetectLibFile)).to.be.false
  // })
  // it('should only link .so files with exact name match', () => {
  //   const objdetectLibFile = 'libopencv_objdetect.so'
  //   const dnnObjdetectLibFile = 'libopencv_dnn_objdetect.so'
  //   const libFiles = [
  //     objdetectLibFile,
  //     dnnObjdetectLibFile
  //   ]
  //   const getLibs = createFake(libFiles)
  //   const res = getLibs()
  //   expect(res).to.be.an('array').lengthOf(opencvModules.length)
  //   expect(res.some(({ opencvModule }) => opencvModule === 'objdetect'))
  //   expect(res.find(l => l.opencvModule === 'objdetect')).to.have.property('libPath').to.equal(objdetectLibFile)
  //   expect(res.some(({ libPath }) => libPath === dnnObjdetectLibFile)).to.be.false
  // })
  // it('should only link .dylib files with exact name match', () => {
  //   const objdetectLibFile = 'libopencv_objdetect.dylib'
  //   const dnnObjdetectLibFile = 'libopencv_dnn_objdetect.dylib'
  //   const libFiles = [
  //     objdetectLibFile,
  //     dnnObjdetectLibFile
  //   ]
  //   const getLibs = createFake(libFiles, { isOSX: true })
  //   const res = getLibs()
  //   expect(res).to.be.an('array').lengthOf(opencvModules.length)
  //   expect(res.some(({ opencvModule }) => opencvModule === 'objdetect'))
  //   expect(res.find(l => l.opencvModule === 'objdetect')).to.have.property('libPath').to.equal(objdetectLibFile)
  //   expect(res.some(({ libPath }) => libPath === dnnObjdetectLibFile)).to.be.false
  // })

})