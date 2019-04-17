import * as fs from 'fs';

import { getLibs } from '.';
import { cmakeArchs, cmakeVsCompilers, defaultCmakeFlags, opencvContribRepoUrl, opencvRepoUrl } from './constants';
import { dirs } from './dirs';
import { autoBuildFlags, numberOfCoresAvailable, opencvVersion, parseAutoBuildFlags, isWithoutContrib, buildWithCuda } from './env';
import { findMsBuild } from './findMsBuild';
import { AutoBuildFile } from './types';
import { exec, isWin, spawn, isCudaAvailable } from './utils';

const log = require('npmlog')

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
      await spawn(`${msbuildExe}`, getMsbuildCmd('./OpenCV.sln'), { cwd: dirs.opencvBuild })
      await spawn(`${msbuildExe}`, getMsbuildCmd('./INSTALL.vcxproj'), { cwd: dirs.opencvBuild })
    }
  }
  return async () => {
    await spawn('make', ['install', `-j${numberOfCoresAvailable()}`], { cwd: dirs.opencvBuild })
    // revert the strange archiving of libopencv.so going on with make install
    await spawn('make', ['all', `-j${numberOfCoresAvailable()}`], { cwd: dirs.opencvBuild })
  }
}

function getCudaCmakeFlags() {
  return [
    '-DWITH_CUDA=ON',
    '-DBUILD_opencv_cudacodec=OFF', // video codec (NVCUVID) is deprecated in cuda 10, so don't add it
    '-DCUDA_FAST_MATH=ON', // optional
    '-DWITH_CUBLAS=ON', // optional
  ];
}

function getSharedCmakeFlags() {
  const conditionalFlags = isWithoutContrib()
    ? []
    : [
      '-DOPENCV_ENABLE_NONFREE=ON',
      `-DOPENCV_EXTRA_MODULES_PATH=${dirs.opencvContribModules}`
    ]

  if (buildWithCuda() && isCudaAvailable()) {
    log.info('install', 'Adding CUDA flags...');
    conditionalFlags.concat(getCudaCmakeFlags());
  }

  return defaultCmakeFlags
    .concat(conditionalFlags)
    .concat(parseAutoBuildFlags())
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
  return [dirs.opencvSrc].concat(cmakeFlags)
}

async function getMsbuildIfWin() {
  if (isWin()) {
    const msbuild = await findMsBuild()
    log.info('install', 'using msbuild:', msbuild)
    return msbuild
  }
}

function writeAutoBuildFile() {
  const autoBuildFile: AutoBuildFile = {
    opencvVersion: opencvVersion(),
    autoBuildFlags: autoBuildFlags(),
    modules: getLibs(dirs.opencvLibDir)
  }
  fs.writeFileSync(dirs.autoBuildFile, JSON.stringify(autoBuildFile))
}

export async function setupOpencv() {
  const msbuild = await getMsbuildIfWin()

  // Get cmake flags here to check for CUDA early on instead of the start of the building process
  const cMakeFlags = isWin() ? getWinCmakeFlags(msbuild.version) : getSharedCmakeFlags();
  
  const tag = opencvVersion()
  log.info('install', 'installing opencv version %s into directory: %s', tag, dirs.opencvRoot)

  await exec(getMkDirCmd('opencv'), { cwd: dirs.rootDir })
  await exec(getRmDirCmd('build'), { cwd: dirs.opencvRoot })
  await exec(getMkDirCmd('build'), { cwd: dirs.opencvRoot })
  await exec(getRmDirCmd('opencv'), { cwd: dirs.opencvRoot })
  await exec(getRmDirCmd('opencv_contrib'), { cwd: dirs.opencvRoot })

  if (isWithoutContrib()) {
    log.info('install', 'skipping download of opencv_contrib since OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB is set')
  } else {
    await spawn('git', ['clone', '-b', `${tag}`, '--single-branch', '--depth',  '1', '--progress', opencvContribRepoUrl], { cwd: dirs.opencvRoot })
  }
  await spawn('git', ['clone', '-b', `${tag}`, '--single-branch', '--depth',  '1', '--progress', opencvRepoUrl], { cwd: dirs.opencvRoot })

  await spawn('cmake', getCmakeArgs(cMakeFlags), { cwd: dirs.opencvBuild })
  await getRunBuildCmd(isWin() ? msbuild.path : undefined)()

  writeAutoBuildFile()

  await exec(getRmDirCmd('opencv'), { cwd: dirs.opencvRoot })
  await exec(getRmDirCmd('opencv_contrib'), { cwd: dirs.opencvRoot })
}
