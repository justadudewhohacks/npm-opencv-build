import { EncodingOption, PathLike } from 'fs';
import type { OpencvModule } from './types.js';

const worldModule = 'world';

interface tsType {
  realpathSync(path: PathLike, options?: EncodingOption): string;
  readdirSync(path: PathLike): string[];
  existsSync(path: PathLike): boolean;
}

interface tsPath {
  resolve(...pathSegments: string[]): string;
}

export function getLibsFactory(
  args: { opencvModules: string[], isWin: () => boolean, isOSX: () => boolean, fs: tsType, path: tsPath }
): (libDir: string) => OpencvModule[] {

  const { opencvModules, isWin, isOSX, fs, path } = args

  function getLibPrefix() {
    return isWin() ? 'opencv_' : 'libopencv_'
  }

  /**
   * @returns lib extention based on current OS
   */
  function getLibSuffix(): 'lib' | 'dylib' | 'so' {
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
  function getLibNameRegex(opencvModuleName: string): RegExp {
    // const regexp = `^${getLibPrefix()}${opencvModuleName}[0-9]{0,3}.${getLibSuffix()}$`;
    const regexp = `^${getLibPrefix()}${opencvModuleName}[0-9.]*\.${getLibSuffix()}$`;
    return new RegExp(regexp)
  }

  function createLibResolver(libDir: string): (libFile: string) => string | undefined {
    function getLibAbsPath(libFile?: string): string | undefined {
      if (!libFile)
        return undefined;
      return fs.realpathSync(path.resolve(libDir, libFile))
    }

    function matchLibName(libFile: string, regexp: RegExp): boolean {
      return !!(libFile.match(regexp) || [])[0]
    }

    const libFiles: string[] = fs.readdirSync(libDir)

    return function (opencvModuleName: string): string | undefined {
      const regexp = getLibNameRegex(opencvModuleName);
      const matchs = libFiles.find(libFile => matchLibName(libFile, regexp));
      return getLibAbsPath(matchs);
    }
  }

  return function (libDir: string): OpencvModule[] {
    if (!fs.existsSync(libDir)) {
      throw new Error(`specified lib dir does not exist: ${libDir}`)
    }

    const resolveLib = createLibResolver(libDir)

    const worldLibPath = resolveLib(worldModule)
    if (worldLibPath) {
      return [{
        opencvModule: worldModule,
        libPath: worldLibPath
      }]
    }

    return opencvModules.map(
      (opencvModule: string) => ({
        opencvModule,
        libPath: resolveLib(opencvModule)
      })
    )
  }
}
