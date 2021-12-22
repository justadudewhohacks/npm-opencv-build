
import { opencvModules } from './constants.js';
import BuildContext from './BuildContext.js';
import { getLibsFactory } from './getLibsFactory.js';
import { isOSX, isWin, isUnix } from './utils.js';
import { getLibs } from './getLibs.js';
import { default as env } from './env.js';

/**
 * list available module + path as OpencvModule[]
 */
export type { OpencvModule, AutoBuildFile } from './types.js'

export { opencvModules } from './constants.js';
export { default as BuildContext } from './BuildContext.js';
export { getLibsFactory } from './getLibsFactory.js';
export { isOSX, isWin, isUnix } from './utils.js';
export { getLibs } from './getLibs.js';
export { default as env } from './env.js';

export default  {
 opencvModules,
 BuildContext,
 getLibsFactory,
 isOSX, isWin, isUnix,
 getLibs,
 env,
}