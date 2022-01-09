import OpenCVBuilder from './OpenCVBuilder.js';
import type { OpencvModule } from './types.js';
import fs from 'fs';
import path from 'path';

const worldModule = 'world';

export class getLibsFactory {
  constructor(private builder: OpenCVBuilder) {
  }

  get getLibPrefix(): string {
    return this.builder.env.isWin ? 'opencv_' : 'libopencv_'
  }

  /**
   * @returns lib extention based on current OS
   */
  get getLibSuffix(): 'lib' | 'dylib' | 'so' {
    switch (this.builder.env.platform) {
      case 'win32':
        return 'lib'
      case 'darwin':
        return 'dylib'
      default:
        return 'so'
    }
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

  public resolveLib(opencvModuleName: string): string {
    const env = this.builder.env;
    const libDir = env.opencvLibDir;
    const libFiles: string[] = fs.readdirSync(libDir)
    return this.matchLib(opencvModuleName, libDir, libFiles);
  }
  /**
   * Match lib file names in a folder, was part of resolveLib, but was splitted for easy testing
   * @param opencvModuleName openCV module name
   * @param libDir library directory
   * @param libFiles files in lib directory
   * @returns full path to looked up lib file
   */
  public matchLib(opencvModuleName: string, libDir: string, libFiles: string[]): string {
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
