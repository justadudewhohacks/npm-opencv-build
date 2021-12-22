export { opencvModules } from './constants';
export { isAutoBuildDisabled, readEnvsFromPackageJson, applyEnvsFromPackageJson } from './env';
export { isOSX, isWin, isUnix } from './utils';
export { BuildContext } from './BuildContext';
/**
 * opencv include directory
 */
/**
 * opencv4 include directory
 */
/**
 * built lib directory
 */
/**
 * built bin directory
 */
/**
 * build directory
 */
/**
 * list available module + path as OpencvModule[]
 */
export declare const getLibs: (libDir: string) => import("./types").OpencvModule[];
export { OpencvModule, AutoBuildFile } from './types';
