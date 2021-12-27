
import OpenCVBuilder from './OpenCVBuilder.js';
import { getLibsFactory } from './getLibsFactory.js';
import { isOSX, isWin, isUnix } from './utils.js';
import { OpenCVBuildEnv } from './BuildEnv.js';

/**
 * list available module + path as OpencvModule[]
 */
export type { OpencvModule, AutoBuildFile } from './types.js'

export { default as OpenCVBuilder } from './OpenCVBuilder.js';
export { getLibsFactory } from './getLibsFactory.js';
export { isOSX, isWin, isUnix } from './utils.js';
export { OpenCVBuildEnv, OpenCVParamBuildOptions as OpenCVBuildEnvParams } from './BuildEnv.js';

export default  {
    OpenCVBuilder,
    OpenCVBuildEnv,
    getLibsFactory,
    isOSX, isWin, isUnix,
}