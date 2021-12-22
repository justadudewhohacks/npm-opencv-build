import path from 'path';
import * as utils from './utils.js';
import type { AutoBuildFile } from './types.js';
import fs from 'fs';
import log from 'npmlog';
import env from './env.js';
import crypto from 'crypto';
import { getLibs } from './getLibs.js';
import { setupOpencv } from './setupOpencv.js';

// import { fileURLToPath } from 'url';
// import { dirname } from 'path';
export class BuildContext {
    public opencvVersion: string;
    public optHash: string;;
    constructor() {
        /**
         * legacy version: 3.4.6
         * current #.x version: 3.4.15
         */
        const DEFAULT_OPENCV_VERSION = '3.4.16'
        const { OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION } = process.env;
        if (!OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION) {
            log.info('init', `${utils.highlight("OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION")} is not defined using default verison ${utils.formatNumber(DEFAULT_OPENCV_VERSION)}`)
        } else {
            log.info('init', `${utils.highlight("OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION")} is defined using verison ${utils.formatNumber(OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION)}`)
        }
        this.opencvVersion = OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION || DEFAULT_OPENCV_VERSION;
        let opt = env.autoBuildFlags() || '';
        
        if (!opt) {
            log.info('init', `${utils.highlight("OPENCV4NODEJS_AUTOBUILD_FLAGS")} is not defined, No extra flags will be append to the build command`)
        } else {
            log.info('init', `${utils.highlight("OPENCV4NODEJS_AUTOBUILD_FLAGS")} is defined, as ${utils.formatNumber("%s")}`, opt);
        }

        if (env.buildWithCuda()) opt+='cuda'
        if (env.isWithoutContrib()) opt+='noContrib'
        if (opt) {
            opt = '-' + crypto.createHash('md5').update(opt).digest('hex').substring(0, 5);
        }

        this.optHash = opt
        log.info('init', `${utils.highlight("Workdir")} will be: ${utils.formatNumber("%s")}`, this.opencvRoot)
    }

    get rootDir(): string {
        // const __filename = fileURLToPath(import.meta.url);
        // const __dirname = dirname(__filename);
        return path.resolve(__dirname, '../');
    }
    get opencvRoot(): string {
        return path.join(this.rootDir, `opencv-${this.opencvVersion}${this.optHash}`)
        // return path.join(this.rootDir, `opencv`)
    }
    get opencvSrc(): string {
        return path.join(this.opencvRoot, 'opencv')
    }
    get opencvContribSrc(): string {
        return path.join(this.opencvRoot, 'opencv_contrib')
    }
    get opencvContribModules(): string {
        return path.join(this.opencvContribSrc, 'modules')
    }
    get opencvBuild(): string {
        return path.join(this.opencvRoot, 'build')
    }
    get opencvInclude(): string {
        return path.join(this.opencvBuild, 'include')
    }
    get opencv4Include(): string {
        return path.join(this.opencvInclude, 'opencv4')
    }
    get opencvLibDir(): string {
        return utils.isWin() ? path.join(this.opencvBuild, 'lib/Release') : path.join(this.opencvBuild, 'lib')
    }
    get opencvBinDir(): string {
        return utils.isWin() ? path.join(this.opencvBuild, 'bin/Release') : path.join(this.opencvBuild, 'bin')
    }
    get autoBuildFile(): string {
        return path.join(this.opencvRoot, 'auto-build.json')
    }

    readAutoBuildFile(): AutoBuildFile | undefined {
        try {
          const fileExists = fs.existsSync(this.autoBuildFile)
          if (fileExists) {
            const autoBuildFile = JSON.parse(fs.readFileSync(this.autoBuildFile).toString()) as AutoBuildFile
            if (!autoBuildFile.opencvVersion || !('autoBuildFlags' in autoBuildFile) || !Array.isArray(autoBuildFile.modules)) {
              throw new Error('auto-build.json has invalid contents')
            }
            return autoBuildFile
          }
          log.info('readAutoBuildFile', 'file does not exists: %s', this.autoBuildFile, this.autoBuildFile)
        } catch (err) {
          log.error('readAutoBuildFile', 'failed to read auto-build.json from: %s, with error: %s', this.autoBuildFile, err.toString())
        }
        return undefined
      }



      checkInstalledLibs(ctxt: BuildContext, autoBuildFile: AutoBuildFile): boolean {
        let hasLibs = true
      
        log.info('install', 'checking for opencv libraries')
      
        if (!fs.existsSync(ctxt.opencvLibDir)) {
          log.info('install', 'library dir does not exist:', ctxt.opencvLibDir)
          return false
        }
        const installedLibs = getLibs(ctxt.opencvLibDir)
      
        autoBuildFile.modules.forEach(({ opencvModule, libPath }) => {
          if (!libPath) {
            log.info('install', '%s: %s', opencvModule, 'ignored')
            return
          }
          const foundLib = installedLibs.find(lib => lib.opencvModule === opencvModule)
          hasLibs = hasLibs && !!foundLib
          log.info('install', `lib ${utils.formatNumber("%s")}: ${utils.light("%s")}`, opencvModule, foundLib ? foundLib.libPath : 'not found')
        })
      
        return hasLibs
      }

      async install(): Promise<void>{
        // if project directory has a package.json containing opencv4nodejs variables
        // apply these variables to the process environment
        env.applyEnvsFromPackageJson()
      
        if (env.isAutoBuildDisabled()) {
          log.info('install', `${utils.highlight('OPENCV4NODEJS_DISABLE_AUTOBUILD')} is set skipping auto build...`)
          return
        }
        log.info('install', `if you want to use an own OpenCV installation set ${utils.highlight('OPENCV4NODEJS_DISABLE_AUTOBUILD')}`)
      
        // prevent rebuild on every install
        const autoBuildFile = this.readAutoBuildFile()
        if (autoBuildFile) {
          log.info('install', `found auto-build.json: ${utils.highlight(this.autoBuildFile)}`)
      
          if (autoBuildFile.opencvVersion !== this.opencvVersion) {
            // can no longer occure with this version of opencv4nodejs-builder
            log.info('install', `auto build opencv version is ${autoBuildFile.opencvVersion}, but OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION=${this.opencvVersion}`)
          } else if (autoBuildFile.autoBuildFlags !== env.autoBuildFlags()) {
            // should no longer occure since -MD5(autoBuildFlags) is append to build path
            log.info('install', `auto build flags are ${autoBuildFile.autoBuildFlags}, but OPENCV4NODEJS_AUTOBUILD_FLAGS=${env.autoBuildFlags()}`)
          } else {
            const hasLibs = this.checkInstalledLibs(this, autoBuildFile)
            if (hasLibs) {
              log.info('install', `all libraries are installed in ${utils.highlight(this.opencvLibDir)} => ${utils.highlight('Skip')} building`)
              return
            } else {
              log.info('install', 'missing some libraries')
            }
          }
        } else {
          log.info('install', `failed to find auto-build.json: ${this.autoBuildFile}`)
        }
      
        log.info('install', '')
        log.info('install', 'running install script...')
        log.info('install', '')
        log.info('install', 'opencv version: %s', this.opencvVersion)
        log.info('install', 'with opencv contrib: %s', env.isWithoutContrib() ? 'no' : 'yes')
        log.info('install', 'custom build flags: %s', env.autoBuildFlags())
        log.info('install', '')
      
        try {
          await utils.requireGit()
          await utils.requireCmake()
          await setupOpencv(this)
        } catch (err) {
          if (err.toString)
            log.error('install', err.toString())
          else
            log.error('install', JSON.stringify(err))
          process.exit(1)
        }
      }
}

export default BuildContext;