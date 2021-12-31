import OpenCVBuilder from './OpenCVBuilder.js';
import type { OpencvModule } from './types.js';

import { isOSX, isWin } from './utils.js';
import fs from 'fs';
import path from 'path';

const worldModule = 'world';

export class getLibsFactory {
  constructor(private builder: OpenCVBuilder) {
  }

  get getLibPrefix(): string {
    return isWin() ? 'opencv_' : 'libopencv_'
  }

  /**
   * @returns lib extention based on current OS
   */
  get getLibSuffix(): 'lib' | 'dylib' | 'so' {
    if (isWin())
      return 'lib'
    if (isOSX())
      return 'dylib'
    return 'so'
  }

  /**
   * build a regexp matching os lib file
   * @param opencvModuleName 
   * @returns 
   */
  getLibNameRegex(opencvModuleName: string): RegExp {
    const regexp = `^${this.getLibPrefix}${opencvModuleName}[0-9.]*\.${this.getLibSuffix}$`;
    return new RegExp(regexp)
  }

  resolveLib(opencvModuleName: string): string {
    const env = this.builder.env;
    const libDir = env.opencvLibDir;
    const libFiles: string[] = fs.readdirSync(env.opencvLibDir)
    const regexp = this.getLibNameRegex(opencvModuleName);
    const match = libFiles.find((libFile: string) => !!(libFile.match(regexp) || [])[0]);
    if (!match)
      return '';
    return fs.realpathSync(path.resolve(libDir, match))
  }

  getLibs(): OpencvModule[] {
    const libDir = this.builder.env.opencvLibDir;
    if (!fs.existsSync(libDir)) {
      throw new Error(`specified lib dir does not exist: ${libDir}`)
    }

    const worldLibPath = this.resolveLib(worldModule)
    if (worldLibPath) {
      return [{
        opencvModule: worldModule,
        libPath: worldLibPath
      }]
    }

    return this.builder.constant.opencvModules.map(
      (opencvModule: string) => ({
        opencvModule,
        libPath: this.resolveLib(opencvModule)
      })
    )
  }
}
