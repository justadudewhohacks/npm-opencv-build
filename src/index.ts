import * as fs from 'fs';
import * as path from 'path';

import { opencvModules } from './constants';
import dirs from './dirs';
import { getLibsFactory } from './getLibsFactory';
import { isOSX, isWin } from './utils';

export { opencvModules } from './constants';
export { isAutoBuildDisabled, readAutoBuildFile, readEnvsFromPackageJson, applyEnvsFromPackageJson } from './env';
export { isOSX, isWin, isUnix } from './utils';
/**
 * opencv include directory
 */
 export const opencvInclude = dirs.opencvInclude
/**
 * opencv4 include directory
 */
export const opencv4Include = dirs.opencv4Include
/**
 * built lib directory
 */
export const opencvLibDir = dirs.opencvLibDir
/**
 * built bin directory
 */
export const opencvBinDir = dirs.opencvBinDir
/**
 * build directory
 */
export const opencvBuildDir = dirs.opencvBuild
/**
 * list available module + path as OpencvModule[]
 */
export const getLibs = getLibsFactory({ isWin, isOSX, opencvModules, path, fs })
export { OpencvModule, AutoBuildFile } from './types'