import * as path from 'path';
import { opencvVersion } from './env';
import { isWin } from './utils';

export class Dirs {
  get rootDir(): string {
    return path.resolve(__dirname, '../');
  }
  get opencvRoot(): string {
    return path.join(this.rootDir, `opencv-${opencvVersion()}`)
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
}
const singleton = new Dirs();
export default singleton;
