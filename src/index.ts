import * as fs from 'fs';
import * as path from 'path';

import { opencvModules } from './constants';
import { dirs } from './dirs';
import { getLibsFactory } from './getLibsFactory';
import { isOSX, isWin } from './utils';

export { opencvModules } from './constants';
export { isAutoBuildDisabled, readAutoBuildFile } from './env';
export const opencvInclude = dirs.opencvInclude
export const opencv4Include = dirs.opencv4Include
export const opencvLibDir = dirs.opencvLibDir
export const opencvBinDir = dirs.opencvBinDir
export const opencvBuildDir = dirs.opencvBuild
export const getLibs = getLibsFactory({ isWin, isOSX, opencvModules, path, fs })