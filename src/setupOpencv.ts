import fs from 'fs';
import { EOL } from 'os';
import { OpenCVBuilder } from './OpenCVBuilder.js';
import { findMsBuild, pathVersion } from './findMsBuild.js';
import type { AutoBuildFile } from './types.js';
import { formatNumber, highlight, protect, spawn, toExecCmd } from './utils.js';
import log from 'npmlog';
import rimraf from 'rimraf';
import { promisify } from 'util';
import { OPENCV_PATHS_ENV } from './misc';

const primraf = promisify(rimraf);

export class SetupOpencv {
  constructor(private readonly builder: OpenCVBuilder) { }

  private getMsbuildCmd(sln: string): string[] {
    return [
      sln,
      '/p:Configuration=Release',
      `/p:Platform=${process.arch === 'x64' ? 'x64' : 'x86'}`,
    ]
  }

  private async runBuildCmd(msbuildExe?: string): Promise<void> {
    const env = this.builder.env;
    if (msbuildExe) {
      if (!fs.existsSync(msbuildExe)) {
        log.error('install', 'invalid msbuildExe path" %s', msbuildExe);
        throw Error('invalid msbuildExe path ' + msbuildExe);
      }
      const buildSLN = this.getMsbuildCmd('./OpenCV.sln');
      let args = toExecCmd(msbuildExe, buildSLN);
      this.execLog.push(`cd ${protect(env.opencvBuild)}`);
      this.execLog.push(args);
      if (!env.dryRun) {
        log.info('install', 'spawning in %s: %s', env.opencvBuild, args);
        await spawn(`${msbuildExe}`, buildSLN, { cwd: env.opencvBuild })
      }
      const buildVcxproj = this.getMsbuildCmd('./INSTALL.vcxproj');
      args = toExecCmd(msbuildExe, buildVcxproj);
      this.execLog.push(`${args}`); 
      if (!env.dryRun) {
        log.info('install', 'spawning in %s: %s', env.opencvBuild, args);
        await spawn(`${msbuildExe}`, buildVcxproj, { cwd: env.opencvBuild })
      }
    } else {
      this.execLog.push(`cd ${protect(env.opencvBuild)}`); 
      this.execLog.push(`make install -j${env.numberOfCoresAvailable()}`); 

      if (!env.dryRun) {
        log.info('install', 'spawning in %s: make', env.opencvBuild);
        await spawn('make', ['install', `-j${env.numberOfCoresAvailable()}`], { cwd: env.opencvBuild })
      }

      this.execLog.push(`make all -j${env.numberOfCoresAvailable()}`); 
      // revert the strange archiving of libopencv.so going on with make install
      if (!env.dryRun) {
        log.info('install', 'spawning in %s: make all', env.opencvBuild);
        await spawn('make', ['all', `-j${env.numberOfCoresAvailable()}`], { cwd: env.opencvBuild })
      }
    }
  }

  private getWinCmakeFlags(msversion: string): string[] {
    const cmakeVsCompiler = this.builder.constant.cmakeVsCompilers[msversion]
    const cmakeArch = this.builder.constant.cmakeArchs[process.arch]

    if (!cmakeVsCompiler) {
      throw new Error(`no cmake Visual Studio compiler found for msversion: ${msversion}`)
    }
    if (!cmakeArch) {
      throw new Error(`no cmake arch found for process.arch: ${process.arch}`)
    }

    let GFlag: string[] = [];
    if (Number(msversion) <= 15)
      GFlag = ['-G', `${cmakeVsCompiler}${cmakeArch}`];
    else
      GFlag = ['-G', `${cmakeVsCompiler}`];
    return GFlag.concat(this.builder.env.getSharedCmakeFlags())
  }

  private getCmakeArgs(cmakeFlags: string[]): string[] {
    return [this.builder.env.opencvSrc].concat(cmakeFlags)
  }

  private async getMsbuildIfWin(): Promise<pathVersion | undefined> {
    if (this.builder.env.isWin) {
      const msbuild = await findMsBuild()
      log.info('install', `using msbuild: ${formatNumber("%s")} path: ${highlight("%s")}`, msbuild.version, msbuild.path)
      return msbuild
    }
    return undefined;
  }
  /**
   * Write Build Context to disk, to avoid further rebuild
   * @returns AutoBuildFile
   */
  public writeAutoBuildFile(overwrite: boolean): AutoBuildFile {
    const env = this.builder.env;
    const autoBuildFile: AutoBuildFile = {
      opencvVersion: env.opencvVersion,
      autoBuildFlags: env.autoBuildFlags,
      modules: this.builder.getLibs.getLibs(),
      env: this.builder.env.dumpEnv(),
    }
    log.info('install', `writing auto-build file into directory: ${highlight("%s")}`, env.autoBuildFile)
    // log.info('install', JSON.stringify(autoBuildFile))
    fs.mkdirSync(env.opencvRoot, {recursive: true});
    if (!overwrite) {
      const old = env.readAutoBuildFile()
      if (old)
        return old;
    }
    fs.writeFileSync(env.autoBuildFile, JSON.stringify(autoBuildFile, null, 4))
    return autoBuildFile;
  }
  private execLog: string[] = [];

  /**
   * clone OpenCV repo
   * build OpenCV
   * delete source files
   */
  public async start(): Promise<void> {
    this.execLog = [];
    const env = this.builder.env;
    const msbuild = await this.getMsbuildIfWin()
    let cMakeFlags: string[] = [];
    let msbuildPath: string | undefined = undefined;
    // Get cmake flags here to check for CUDA early on instead of the start of the building process
    if (env.isWin) {
      if (!msbuild)
        throw Error('Error getting Ms Build info');
      cMakeFlags = this.getWinCmakeFlags("" + msbuild.version);
      msbuildPath = msbuild.path;
    } else {
      cMakeFlags = this.builder.env.getSharedCmakeFlags();
    }

    const tag = env.opencvVersion
    log.info('install', `installing opencv version ${formatNumber("%s")} into directory: ${highlight("%s")}`, tag, env.opencvRoot)
    log.info('install', `Cleaning old build: src, build and contrib-src directories`)
    try {
      for (const k of OPENCV_PATHS_ENV) {
        const v = process.env[k];
        if (v) {
          const setEnv = (process.platform === 'win32') ? '$Env:' : 'export ';
          this.execLog.push(`${setEnv}${k}=${protect(v)}`);
        }
      }
      // clean up
      const dirs = [env.opencvBuild, env.opencvSrc, env.opencvContribSrc];
      this.execLog.push(toExecCmd('rimraf', dirs))
      for (const dir of dirs)
        await primraf(dir);
      // ensure build dir exists
      this.execLog.push(toExecCmd('mkdir', ['-p', env.opencvBuild]))
      fs.mkdirSync(env.opencvBuild, { recursive: true });

      // hide detached HEAD message.
      const gitFilter = (data: Buffer): Buffer | null => {
        const asTxt = data.toString();
        if (asTxt.includes('detached HEAD')) return null;
        if (asTxt.includes('--depth is ignored in local clones')) return null;
        return data;
      }

      if (env.isWithoutContrib) {
        this.execLog.push(toExecCmd('cd', [env.opencvRoot]))
        log.info('install', `skipping download of opencv_contrib since ${highlight("OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB")} is set`)
      } else {
        let opencvContribRepoUrl = this.builder.constant.opencvContribRepoUrl;
        if (this.builder.env.gitCache) {
          if (!fs.existsSync(this.builder.env.opencvContribGitCache)) {
            const args = ['clone', '--quiet', '--progress', opencvContribRepoUrl, this.builder.env.opencvContribGitCache];
            await spawn('git', args, { cwd: env.opencvRoot }, {err: gitFilter});
          } else {
            await spawn('git', [ 'pull' ], { cwd: env.opencvContribGitCache }, {err: gitFilter});
          }
          opencvContribRepoUrl = env.opencvContribGitCache.replace(/\\/g, '/');
        }
        log.info('install', `git clone ${opencvContribRepoUrl}`)
        const args = ['clone', '--quiet', '-b', `${tag}`, '--single-branch', '--depth', '1', '--progress', opencvContribRepoUrl, env.opencvContribSrc];
        this.execLog.push(toExecCmd('cd', [env.opencvRoot]))
        this.execLog.push(toExecCmd('git', args))
        await spawn('git', args, { cwd: env.opencvRoot }, {err: gitFilter});
      }
      let opencvRepoUrl = this.builder.constant.opencvRepoUrl;

      if (this.builder.env.gitCache) {
        if (!fs.existsSync(this.builder.env.opencvGitCache)) {
          const args = ['clone', '--quiet', '--progress', opencvRepoUrl, this.builder.env.opencvGitCache];
          await spawn('git', args, { cwd: env.opencvRoot }, {err: gitFilter});
        } else {
          await spawn('git', [ 'pull' ], { cwd: env.opencvGitCache }, {err: gitFilter});
        }
        opencvRepoUrl = env.opencvGitCache.replace(/\\/g, '/');
      }

      log.info('install', `git clone ${opencvRepoUrl}`)
      const args2 = ['clone', '--quiet', '-b', `${tag}`, '--single-branch', '--depth', '1', '--progress', opencvRepoUrl, env.opencvSrc];
      this.execLog.push(toExecCmd('git', args2))
      await spawn('git', args2, { cwd: env.opencvRoot }, {err: gitFilter})

      this.execLog.push(`export OPENCV_BIN_DIR=${protect(env.opencvBinDir)}`);
      this.execLog.push(`export OPENCV_INCLUDE_DIR=${protect(env.opencvIncludeDir)}`);
      this.execLog.push(`export OPENCV_LIB_DIR=${protect(env.opencvLibDir)}`);

      const cmakeArgs = this.getCmakeArgs(cMakeFlags)
      log.info('install', 'running in %s cmake %s', protect(env.opencvBuild), cmakeArgs.map(protect).join(' '))
      this.execLog.push(toExecCmd('cd', [env.opencvBuild]))
      this.execLog.push(toExecCmd('cmake', cmakeArgs))
      if (!env.dryRun) {
        await spawn('cmake', cmakeArgs, { cwd: env.opencvBuild })
        log.info('install', 'starting build...')
      }
      await this.runBuildCmd(msbuildPath)
    } catch (e) {
      log.error(`Compilation failed, previous calls:${EOL}%s`, this.execLog.join(EOL));
      throw e;
    }

    if (!env.dryRun) {
      this.writeAutoBuildFile(true)
    } else {
      this.execLog.push('echo lock file can not be generated in dry-mode');
    }
    // cmake -D CMAKE_BUILD_TYPE=RELEASE -D ENABLE_NEON=ON 
    // -D ENABLE_TBB=ON -D ENABLE_IPP=ON -D ENABLE_VFVP3=ON -D WITH_OPENMP=ON -D WITH_CSTRIPES=ON -D WITH_OPENCL=ON -D CMAKE_INSTALL_PREFIX=/usr/local
    // -D OPENCV_EXTRA_MODULES_PATH=/root/[username]/opencv_contrib-3.4.0/modules/ ..
    if (!env.keepsources && !env.dryRun) {
      /**
       * DELETE TMP build dirs
       */
      try {
        await primraf(env.opencvSrc)
      } catch (err) {
        log.error('install', 'failed to clean opencv source folder:', err)
        log.error('install', `consider removing the folder yourself: ${highlight("%s")}`, env.opencvSrc)
      }

      try {
        await primraf(env.opencvContribSrc)
      } catch (err) {
        log.error('install', 'failed to clean opencv_contrib source folder:', err)
        log.error('install', `consider removing the folder yourself: ${highlight("%s")}`, env.opencvContribSrc)
      }
    }
    if (env.dryRun) {
      console.log();
      console.log();
      console.log(this.execLog.join(EOL));
    }
  }
}