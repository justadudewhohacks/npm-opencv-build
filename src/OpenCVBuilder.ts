import * as utils from './utils.js';
import type { AutoBuildFile } from './types.js';
import fs from 'fs';
import log from 'npmlog';
import { getLibsFactory } from './getLibsFactory.js';
import { SetupOpencv } from './setupOpencv.js';
import { Constant } from './constants.js';
import { OpenCVBuildEnv } from './BuildEnv.js';

// import { fileURLToPath } from 'url';
// import { dirname } from 'path';
export class OpenCVBuilder {
    // public readonly opencvVersion: string;
    public readonly constant: Constant;
    public readonly getLibs: getLibsFactory;

    constructor(public readonly env = new OpenCVBuildEnv()) {
        /**
         * legacy version: 3.4.6
         * current #.x version: 3.4.15
         */

        log.info('init', `${utils.highlight("Workdir")} will be: ${utils.formatNumber("%s")}`, this.env.opencvRoot)
        this.constant = new Constant(this)
        this.getLibs = new getLibsFactory(this)
    }

    private readAutoBuildFile(): AutoBuildFile | undefined {
      const autoBuildFile = this.env.autoBuildFile
      try {
          const fileExists = fs.existsSync(autoBuildFile)
          if (fileExists) {
            const autoBuildFileData = JSON.parse(fs.readFileSync(autoBuildFile).toString()) as AutoBuildFile
            if (!autoBuildFileData.opencvVersion || !('autoBuildFlags' in autoBuildFileData) || !Array.isArray(autoBuildFileData.modules)) {
              throw new Error('auto-build.json has invalid contents')
            }
            return autoBuildFileData
          }
          log.info('readAutoBuildFile', 'file does not exists: %s', autoBuildFile)
        } catch (err) {
          log.error('readAutoBuildFile', 'failed to read auto-build.json from: %s, with error: %s', autoBuildFile, err.toString())
        }
        return undefined
      }

      private checkInstalledLibs(autoBuildFile: AutoBuildFile): boolean {
        let hasLibs = true
      
        log.info('install', 'checking for opencv libraries')
      
        if (!fs.existsSync(this.env.opencvLibDir)) {
          log.info('install', 'library dir does not exist:', this.env.opencvLibDir)
          return false
        }
        const installedLibs = this.getLibs.getLibs()
      
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
        // this.env.applyEnvsFromPackageJson()
      
        if (this.env.isAutoBuildDisabled) {
          log.info('install', `${utils.highlight('OPENCV4NODEJS_DISABLE_AUTOBUILD')} is set skipping auto build...`)
          return
        }
        log.info('install', `if you want to use an own OpenCV installation set ${utils.highlight('OPENCV4NODEJS_DISABLE_AUTOBUILD')}`)
      
        // prevent rebuild on every install
        const autoBuildFile = this.readAutoBuildFile()
        if (autoBuildFile) {
          log.info('install', `found auto-build.json: ${utils.highlight(this.env.autoBuildFile)}`)
      
          if (autoBuildFile.opencvVersion !== this.env.opencvVersion) {
            // can no longer occure with this version of opencv4nodejs-builder
            log.info('install', `auto build opencv version is ${autoBuildFile.opencvVersion}, but AUTOBUILD_OPENCV_VERSION=${this.env.opencvVersion}`)
          } else if (autoBuildFile.autoBuildFlags !== this.env.autoBuildFlags) {
            // should no longer occure since -MD5(autoBuildFlags) is append to build path
            log.info('install', `auto build flags are ${autoBuildFile.autoBuildFlags}, but AUTOBUILD_FLAGS is ${this.env.autoBuildFlags}`)
          } else {
            const hasLibs = this.checkInstalledLibs(autoBuildFile)
            if (hasLibs) {
              log.info('install', `all libraries are installed in ${utils.highlight(this.env.opencvLibDir)} => ${utils.highlight('Skip')} building`)
              return
            } else {
              log.info('install', 'missing some libraries')
            }
          }
        } else {
          log.info('install', `failed to find auto-build.json: ${this.env.autoBuildFile}`)
        }
      
        log.info('install', '')
        log.info('install', 'running install script...')
        log.info('install', '')
        log.info('install', 'opencv version: %s', this.env.opencvVersion)
        log.info('install', 'with opencv contrib: %s', this.env.isWithoutContrib ? 'no' : 'yes')
        log.info('install', 'custom build flags: %s', this.env.autoBuildFlags)
        log.info('install', '')
      
        try {
          await utils.requireGit()
          await utils.requireCmake()
          await new SetupOpencv(this).start()
        } catch (err) {
          if (err.toString)
            log.error('install', err.toString())
          else
            log.error('install', JSON.stringify(err))
          process.exit(1)
        }
      }
}

export default OpenCVBuilder;