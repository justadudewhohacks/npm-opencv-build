import fs from 'fs';
import path from 'path';

import { opencvModules } from './constants.js';
// import BuildContext from './BuildContext';
import { getLibsFactory } from './getLibsFactory.js';
import { isOSX, isWin } from './utils.js';

export { opencvModules } from './constants.js';
export { isAutoBuildDisabled, readEnvsFromPackageJson, applyEnvsFromPackageJson } from './env.js';
export { isOSX, isWin, isUnix } from './utils.js';

export { BuildContext } from './BuildContext.js';

/**
 * opencv include directory
 */
// export const opencvInclude = dirs.opencvInclude
/**
 * opencv4 include directory
 */
//export const opencv4Include = dirs.opencv4Include
/**
 * built lib directory
 */
//export const opencvLibDir = dirs.opencvLibDir
/**
 * built bin directory
 */
//export const opencvBinDir = dirs.opencvBinDir
/**
 * build directory
 */
//export const opencvBuildDir = dirs.opencvBuild
/**
 * list available module + path as OpencvModule[]
 */
export const getLibs = getLibsFactory({ isWin, isOSX, opencvModules, path, fs })
export type { OpencvModule, AutoBuildFile } from './types.js'