import * as path from 'path';
import { isWin } from './utils';
import { AutoBuildFile } from './types';
import * as fs from 'fs';
import * as log from 'npmlog';

export class BuildContext {
    public opencvVersion: string;
    constructor() {
        /**
         * legacy version: 3.4.6
         * current #.x version: 3.4.15
         */
        this.opencvVersion = process.env.OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION || '3.4.6';
    }

    get rootDir(): string {
        return path.resolve(__dirname, '../');
    }
    get opencvRoot(): string {
        return path.join(this.rootDir, `opencv-${this.opencvVersion}`)
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