import fs from 'fs';
import path from 'path';

import { opencvModules } from './constants.js';
// import BuildContext from './BuildContext';
import { getLibsFactory } from './getLibsFactory.js';
import { isOSX, isWin } from './utils.js';

export { opencvModules } from './constants.js';
export { default as env } from './env.js';
export { isOSX, isWin, isUnix } from './utils.js';

export { BuildContext } from './BuildContext.js';

/**
 * list available module + path as OpencvModule[]
 */
export const getLibs = getLibsFactory({ isWin, isOSX, opencvModules, path, fs })
export type { OpencvModule, AutoBuildFile } from './types.js'