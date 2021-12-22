import path from 'path';
import { isWin } from './utils.js';
import type { AutoBuildFile } from './types.js';
import fs from 'fs';
import log from 'npmlog';
import { highlight, formatNumber } from './utils';
import env from './env.js';
import crypto from 'crypto';

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
            log.info('init', `${highlight("OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION")} is not defined using default verison ${formatNumber(DEFAULT_OPENCV_VERSION)}`)
        } else {
            log.info('init', `${highlight("OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION")} is defined using verison ${formatNumber(OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION)}`)
        }
        this.opencvVersion = OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION || DEFAULT_OPENCV_VERSION;
        let opt = env.autoBuildFlags() || '';

        if (!opt) {
            log.info('init', `${highlight("OPENCV4NODEJS_AUTOBUILD_FLAGS")} is not defined, No extra flags will be append to the build command`)
        } else {
            log.info('init', `${highlight("OPENCV4NODEJS_AUTOBUILD_FLAGS")} is defined, as ${formatNumber("%s")}`, opt);
        }

        if (opt) {
            opt = '-' + crypto.createHash('md5').update(opt).digest('hex').substring(0, 5);
        }

        this.optHash = opt
        log.info('init', `${highlight("Workdir")} will be: ${formatNumber("%s")}`, this.opencvRoot)
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
        return isWin() ? path.join(this.opencvBuild, 'lib/Release') : path.join(this.opencvBuild, 'lib')
    }
    get opencvBinDir(): string {
        return isWin() ? path.join(this.opencvBuild, 'bin/Release') : path.join(this.opencvBuild, 'bin')
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
}

export default BuildContext;