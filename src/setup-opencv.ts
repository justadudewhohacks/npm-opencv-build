import { cmakeArchs, cmakeVsCompilers, defaultCmakeFlags, opencvContribRepoUrl, opencvRepoUrl } from './constants';
import { flags, opencvVersion } from './env';
import { exec, isWin, spawn } from './utils';

const log = require('npmlog')
const findMsBuild = require('./find-msbuild')
const {
  rootDir,
  opencvRoot,
  opencvSrc,
  opencvBuild,
  numberOfCoresAvailable
} = require('../constants')

function getIfExistsDirCmd(dirname: string, exists: boolean = true): string {
  return isWin() ? `if ${!exists ? 'not ' : ''}exist ${dirname}` : ''
}

function getMkDirCmd(dirname: string): string {
  return isWin() ? `${getIfExistsDirCmd(dirname, false)} mkdir ${dirname}` : `mkdir -p ${dirname}`
}

function getRmDirCmd(dirname: string): string {
  return isWin() ? `${getIfExistsDirCmd(dirname)} rd /s /q ${dirname}` : `rm -rf ${dirname}`
}

function getMsbuildCmd(sln: string): string[] {
  return [
    sln,
    '/p:Configuration=Release',
    `/p:Platform=${process.arch === 'x64' ? 'x64' : 'x86'}`
  ]
}

function getRunBuildCmd(msbuildExe: string): () => Promise<void> {
  if (msbuildExe) {
    return async () => {
      await spawn(`${msbuildExe}`, getMsbuildCmd('./OpenCV.sln'), { cwd: opencvBuild })
      await spawn(`${msbuildExe}`, getMsbuildCmd('./INSTALL.vcxproj'), { cwd: opencvBuild })
    }
  }
  return async () => {
    await spawn('make', ['install', `-j${numberOfCoresAvailable}`], { cwd: opencvBuild })
    // revert the strange archiving of libopencv.so going on with make install
    await spawn('make', ['all', `-j${numberOfCoresAvailable}`], { cwd: opencvBuild })
  }
}

function getSharedCmakeFlags() {
  return defaultCmakeFlags.concat(flags());
}

function getWinCmakeFlags(msversion: string) {
  const cmakeVsCompiler = (cmakeVsCompilers as any)[msversion]
  const cmakeArch = (cmakeArchs as any)[process.arch]

  if (!cmakeVsCompiler) {
    throw new Error(`no cmake vs compiler found for msversion: ${msversion}`)
  }
  if (!cmakeArch) {
    throw new Error(`no cmake arch found for process.arch: ${process.arch}`)
  }

  return [
    '-G',
    `${cmakeVsCompiler}${cmakeArch}`
  ].concat(getSharedCmakeFlags())
}

function getCmakeArgs(cmakeFlags: string[]) {
  return [opencvSrc].concat(cmakeFlags)
}

function getMsbuildIfWin() {
  if (isWin()) {
    const msbuild = findMsBuild()
    log.info('install', 'using msbuild:', msbuild)
    return msbuild
  }
}

export async function setupOpencv() {
  const tag = opencvVersion()

  const msbuild = await getMsbuildIfWin()

  await exec(getMkDirCmd('opencv'), { cwd: rootDir })
  await exec(getRmDirCmd('build'), { cwd: opencvRoot })
  await exec(getMkDirCmd('build'), { cwd: opencvRoot })
  await exec(getRmDirCmd('opencv'), { cwd: opencvRoot })
  await exec(getRmDirCmd('opencv_contrib'), { cwd: opencvRoot })
  await spawn('git', ['clone', '-b', `${tag}`, '--single-branch', '--depth',  '1', '--progress', opencvContribRepoUrl], { cwd: opencvRoot })
  await spawn('git', ['clone', '-b', `${tag}`, '--single-branch', '--depth',  '1', '--progress', opencvRepoUrl], { cwd: opencvRoot })
  await spawn('cmake', getCmakeArgs(isWin() ? getWinCmakeFlags(msbuild.version) : getSharedCmakeFlags()), { cwd: opencvBuild })
  await getRunBuildCmd(isWin() ? msbuild.path : undefined)
  await exec(getRmDirCmd('opencv'), { cwd: opencvRoot })
  await exec(getRmDirCmd('opencv_contrib'), { cwd: opencvRoot })
}
