export { opencvModules } from './constants';
export { isAutoBuildDisabled, readAutoBuildFile, readEnvsFromPackageJson, applyEnvsFromPackageJson } from './env';
export { isOSX, isWin, isUnix } from './utils';
/**
 * opencv include directory
 */
export declare const opencvInclude: string;
/**
 * opencv4 include directory
 */
export declare const opencv4Include: string;
/**
 * built lib directory
 */
export declare const opencvLibDir: string;
/**
 * built bin directory
 */
export declare const opencvBinDir: string;
/**
 * build directory
 */
export declare const opencvBuildDir: string;
/**
 * list available module + path as OpencvModule[]
 */
export declare const getLibs: (libDir: string) => import("./types").OpencvModule[];
export { OpencvModule, AutoBuildFile } from './types';
