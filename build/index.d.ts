export { opencvModules } from './constants';
export { isAutoBuildDisabled, readAutoBuildFile } from './env';
export declare const opencvInclude: string;
export declare const opencv4Include: string;
export declare const opencvLibDir: string;
export declare const opencvBinDir: string;
export declare const opencvBuildDir: string;
export declare const getLibs: (libDir: string) => import("./types").OpencvModule[];
