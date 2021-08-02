import * as fs from 'fs';
import * as path from 'path';
import { getLibs } from '.';
import { cmakeArchs, cmakeVsCompilers, defaultCmakeFlags, opencvContribRepoUrl, opencvRepoUrl } from './constants';
import { dirs } from './dirs';
import {
  autoBuildFlags,
  buildWithCuda,
  isWithoutContrib,
  numberOfCoresAvailable,
  opencvVersion,
  parseAutoBuildFlags,
} from './env';
import { findMsBuild, pathVersion } from './findMsBuild';
import { AutoBuildFile } from './types';
import { isCudaAvailable, isWin, spawn } from './utils';
import * as log from 'npmlog';
import * as rimraf from 'rimraf';
import { promisify } from 'util';

const primraf = promisify(rimraf);

// function getIfExistsDirCmd(dirname: string, exists: boolean = true): string {
//   return isWin() ? `if ${!exists ? 'not ' : ''}exist ${dirname}` : ''
// }

//function getMkDirCmd(dirname: string): string {
//  return isWin() ? `${getIfExistsDirCmd(dirname, false)} mkdir ${dirname}` : `mkdir -p ${dirname}`
//}

//function getRmDirCmd(dirname: string): string {
//  return isWin() ? `${getIfExistsDirCmd(dirname)} rd /s /q ${dirname}` : `rm -rf ${dirname}`
//}

function getMsbuildCmd(sln: string): string[] {
  return [
    sln,
    '/p:Configuration=Release',
    `/p:Platform=${process.arch === 'x64' ? 'x64' : 'x86'}`
  ]
}

function getRunBuildCmd(msbuildExe?: string): () => Promise<void> {
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

function getCudaCmakeFlags(): string[] {
  return [
    '-DWITH_CUDA=ON',
    '-DBUILD_opencv_cudacodec=OFF', // video codec (NVCUVID) is deprecated in cuda 10, so don't add it
    '-DCUDA_FAST_MATH=ON', // optional
    '-DWITH_CUBLAS=ON', // optional
  ];
}

function getSharedCmakeFlags(): string[] {
  let conditionalFlags = isWithoutContrib()
    ? []
    : [
      '-DOPENCV_ENABLE_NONFREE=ON',
      `-DOPENCV_EXTRA_MODULES_PATH=${dirs.opencvContribModules}`
    ]

  if (buildWithCuda() && isCudaAvailable()) {
    log.info('install', 'Adding CUDA flags...');
    conditionalFlags = conditionalFlags.concat(getCudaCmakeFlags());
  }

  return defaultCmakeFlags
    .concat(conditionalFlags)
    .concat(parseAutoBuildFlags())
}

function getWinCmakeFlags(msversion: string): string[] {
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

function getCmakeArgs(cmakeFlags: string[]): string[] {
  return [dirs.opencvSrc].concat(cmakeFlags)
}

async function getMsbuildIfWin(): Promise<pathVersion | undefined> {
  if (isWin()) {
    const msbuild = await findMsBuild()
    log.info('install', 'using msbuild:', msbuild)
    return msbuild
  }
  return undefined;
}

function writeAutoBuildFile(): void {
  const autoBuildFile: AutoBuildFile = {
    opencvVersion: opencvVersion(),
    autoBuildFlags: autoBuildFlags(),
    modules: getLibs(dirs.opencvLibDir)
  }
  log.info('install', 'writing auto-build file into directory: %s', dirs.autoBuildFile)
  log.info('install', JSON.stringify(autoBuildFile))
  fs.writeFileSync(dirs.autoBuildFile, JSON.stringify(autoBuildFile))
}

export async function setupOpencv(): Promise<void> {
  const msbuild = await getMsbuildIfWin()
  let cMakeFlags: string[] = [];
  let msbuildPath: string | undefined = undefined;
  // Get cmake flags here to check for CUDA early on instead of the start of the building process
  if (isWin()) {
    if (!msbuild)
      throw Error('Error getting Ms Build info');
    cMakeFlags = getWinCmakeFlags("" + msbuild.version);
    msbuildPath = msbuild.path;
  } else {
    cMakeFlags = getSharedCmakeFlags();
  }

  const tag = opencvVersion()
  log.info('install', 'installing opencv version %s into directory: %s', tag, dirs.opencvRoot)

  // await exec(getMkDirCmd('opencv'), { cwd: dirs.rootDir })
  fs.mkdirSync(path.join(dirs.rootDir, 'opencv'), {recursive: true});

  // await exec(getRmDirCmd('build'), { cwd: dirs.opencvRoot })
  await primraf(path.join(dirs.opencvRoot, 'build'));

  // await exec(getMkDirCmd('build'), { cwd: dirs.opencvRoot })
  fs.mkdirSync(path.join(dirs.opencvRoot, 'build'), {recursive: true});

  // await exec(getRmDirCmd('opencv'), { cwd: dirs.opencvRoot })
  await primraf(path.join(dirs.opencvRoot, 'opencv'));

  // await exec(getRmDirCmd('opencv_contrib'), { cwd: dirs.opencvRoot })
  await primraf(path.join(dirs.opencvRoot, 'opencv_contrib'));

  if (isWithoutContrib()) {
    log.info('install', 'skipping download of opencv_contrib since OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB is set')
  } else {
    await spawn('git', ['clone', '-b', `${tag}`, '--single-branch', '--depth',  '1', '--progress', opencvContribRepoUrl], { cwd: dirs.opencvRoot })
  }
  await spawn('git', ['clone', '-b', `${tag}`, '--single-branch', '--depth',  '1', '--progress', opencvRepoUrl], { cwd: dirs.opencvRoot })

  const cmakeArgs = getCmakeArgs(cMakeFlags)
  log.info('install', 'running cmake %s', cmakeArgs)
  await spawn('cmake', cmakeArgs, { cwd: dirs.opencvBuild })
  log.info('install', 'starting build...')
  await getRunBuildCmd(msbuildPath)()

  writeAutoBuildFile()

  rimraf.sync('opencv');
  // const rmOpenCV = getRmDirCmd('opencv')
  try {
    await primraf(path.join(dirs.opencvRoot, 'opencv'))
    // await exec(rmOpenCV, { cwd: dirs.opencvRoot })
  } catch (err) {
    log.error('install', 'failed to clean opencv source folder:', err)
    // log.error('install', 'command was: %s', rmOpenCV)
    log.error('install', 'consider removing the folder yourself: %s', path.join(dirs.opencvRoot, 'opencv'))
  }

  // const rmOpenCVContrib = getRmDirCmd('opencv_contrib')
  try {
    await primraf(path.join(dirs.opencvRoot, 'opencv_contrib'))
    // await exec(rmOpenCVContrib, { cwd: dirs.opencvRoot })
  } catch (err) {
    log.error('install', 'failed to clean opencv_contrib source folder:', err)
    // log.error('install', 'command was: %s', rmOpenCV)
    log.error('install', 'consider removing the folder yourself: %s', path.join(dirs.opencvRoot, 'opencv_contrib'))
  }
}
