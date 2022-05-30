/**
 * options passed to OpenCVBuildEnv constructor
 * highest priority values
 */
export interface OpenCVBuildEnvParamsBool {
    autoBuildBuildCuda?: boolean;
    autoBuildWithoutContrib?: boolean;
    disableAutoBuild?: boolean;
    keepsources?: boolean;
    'dry-run'?: boolean;
    'git-cache'?: boolean;
}

type boolKey = keyof OpenCVBuildEnvParamsBool;

export interface OpenCVBuildEnvParamsString {
    /**
     * OpenCV-build root directory, deprecated in favor of buildRoot
     */
    rootcwd?: string;
    /**
     * OpenCV build directory, this directory will be populate with a folder per build, permiting to reused previous build.
     */
    buildRoot?: string;
    /**
     * OpenCV version to build
     */
    autoBuildOpencvVersion?: string;
    /**
     * OpenCV cMake Build flags
     */
    autoBuildFlags?: string;
    /**
     * OpenCV include directory
     * looks like: opencv/build/include
     */
    opencvIncludeDir?: string; // or external build apt / brew / yum / chocolatey...
    /**
     * OpenCV library directory
     * looks like: opencv/build/.../lib
     */
    opencvLibDir?: string; // never used based on opencvBuild path + OS postfix
    /**
     * OpenCV bin directory
     * looks like: opencv/build/.../bin
     */
    opencvBinDir?: string;// never used based on opencvBuild path + OS postfix
}
type stringKey = keyof OpenCVBuildEnvParamsString;

/**
 * Options as usable in opencv4nodejs section from package.json
 * Middle priority values
 */
export type OpenCVPackageBuildOptions = { [key in boolKey | stringKey]?: string };

export interface OpenCVBuildEnvParams extends OpenCVBuildEnvParamsBool, OpenCVBuildEnvParamsString {
    /**
     * Allow speedup API usage by allowing direct access to a preexisting build
     */
    prebuild?: 'latestBuild' | 'latestVersion' | 'oldestBuild' | 'oldestVersion',
    extra?: { [key: string]: string },
}

/**
 * local args parser model
 */
export interface ArgInfo {
    arg: string;
    conf: keyof OpenCVPackageBuildOptions;
    env: string;
    isBool: boolean;
    doc: string;
}

/**
 * list of variables needed to link and use openCV
 */
export const OPENCV_PATHS_ENV = ['OPENCV_BIN_DIR', 'OPENCV_INCLUDE_DIR', 'OPENCV_LIB_DIR'] as const;

/**
 * arguments data
 * key must be === arg
 */
export const ALLARGS = {
    version: { arg: 'version', conf: 'autoBuildOpencvVersion', env: 'OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION', isBool: false, doc: 'OpenCV version' } as ArgInfo,
    flags: { arg: 'flags', conf: 'autoBuildFlags', env: 'OPENCV4NODEJS_AUTOBUILD_FLAGS', isBool: false, doc: 'OpenCV cMake Build flags' } as ArgInfo,
    root: { arg: 'root', conf: 'rootcwd', env: 'INIT_CWD', isBool: false, doc: 'OpenCV-build root directory (deprecated)' } as ArgInfo,
    buildRoot: { arg: 'buildRoot', conf: 'buildRoot', env: 'OPENCV_BUILD_ROOT', isBool: false, doc: 'OpenCV build directory' } as ArgInfo,
    cuda: { arg: 'cuda', conf: 'autoBuildBuildCuda', env: 'OPENCV4NODEJS_BUILD_CUDA', isBool: true, doc: 'Enable cuda in OpenCV build' } as ArgInfo,
    nocontrib: { arg: 'nocontrib', conf: 'autoBuildWithoutContrib', env: 'OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB', isBool: true, doc: 'Do not compile Contrib modules' } as ArgInfo,
    nobuild: { arg: 'nobuild', conf: 'disableAutoBuild', env: 'OPENCV4NODEJS_DISABLE_AUTOBUILD', isBool: true, doc: 'Do build OpenCV' } as ArgInfo,
    incDir: { arg: 'incDir', conf: 'opencvIncludeDir', env: 'OPENCV_INCLUDE_DIR', isBool: false, doc: 'OpenCV include directory' } as ArgInfo,
    libDir: { arg: 'libDir', conf: 'opencvLibDir', env: 'OPENCV_LIB_DIR', isBool: false, doc: 'OpenCV library directory' } as ArgInfo,
    binDir: { arg: 'binDir', conf: 'opencvBinDir', env: 'OPENCV_BIN_DIR', isBool: false, doc: 'OpenCV bin directory' } as ArgInfo,
    keepsources: { arg: 'keepsources', conf: 'keepsources', isBool: true, doc: 'Keepsources OpenCV source after build' } as ArgInfo,
    'dry-run': { arg: 'dry-run', conf: 'dry-run', isBool: true, doc: 'Display command line use to build library' } as ArgInfo,
    'git-cache': { arg: 'git-cache', conf: 'git-cache', env: 'OPENCV_GIT_CACHE', isBool: true, doc: 'Reduce Bandwide usage, by keeping a local git souce un the buildRoot' } as ArgInfo,
}
/**
 * generate help message
 * @returns help message as text with colors
 */
export const genHelp = (): string => {
    return Object.values(ALLARGS).map(a => {
        const name = `--${a.arg}${!a.isBool ? ' <value>' : ''}`;
        const envWay = a.env ? ` (${a.env} env variable)` : '';
        return `   ${name.padEnd(20)} ${a.doc.padEnd(40)}${envWay}`
    }
    ).join('\n');
}
/**
 * A basic args parser
 * @param args cmd lines args
 * @returns and openCVBuildEnvParams object containing an extra object with all unknown args
 */
export const args2Option = (args: string[]): OpenCVBuildEnvParams => {
    const out: OpenCVBuildEnvParams = { extra: {} };
    for (let i = 0; i < args.length; i++) {
        let arg = args[i];
        if (arg.startsWith('--')) {
            arg = arg.substring(2);
        } else if (arg.startsWith('-')) {
            arg = arg.substring(1);
        } else {
            continue;
        }
        const p = arg.indexOf('=');
        const name = ((p === -1) ? arg : arg.substring(0, p));
        const info = ALLARGS[name as keyof typeof ALLARGS];
        if (!info) {
            // keep unknown args in extras
            const val = (p > 0) ? arg.substring(p + 1) : (i + 1 < args.length) ? args[i + 1] : '1';
            if (out.extra)
                out.extra[name] = val;
            continue;
        }
        if (info.isBool) {
            out[info.conf as boolKey] = true;
            continue;
        }
        const val = (p > 0) ? arg.substring(p + 1) : args[++i];
        if (val)
            out[info.conf as stringKey] = val;
    }
    // encvIncludeDir?: string;
    return out
}

/**
 * All available module fron openCV 4.5.5
 */
export const ALL_OPENCV_MODULES = ['apps', 'aruco', 'bgsegm', 'bioinspired', 'calib3d', 'ccalib',
    'core', 'datasets', 'dnn', 'dnn_objdetect', 'dpm', 'features2d', 'flann', 'fuzzy',
    'gapi', 'hfs', 'highgui', 'img_hash', 'imgcodecs', 'imgproc', 'java_bindings_generator',
    'js', 'js_bindings_generator', 'line_descriptor', 'ml', 'objc_bindings_generator',
    'objdetect', 'optflow', 'phase_unwrapping', 'photo', 'python3', 'python_bindings_generator',
    'python_tests', 'reg', 'rgbd', 'saliency', 'shape', 'stereo', 'stitching', 'structured_light',
    'superres', 'surface_matching', 'ts', 'video', 'videoio', 'wechat_qrcode', 'world',
    'xobjdetect', 'xphoto',
    // olds:
    'videostab', 'face', 'text', 'tracking', 'xfeatures2d', 'ximgproc',
] as const;

/**
 * type of valid openCV Modules
 */
export type OpencvModulesType = typeof ALL_OPENCV_MODULES[number];

export const defaultEnabledModules: OpencvModulesType[] = ['calib3d', 'core', 'dnn', 'features2d', 'flann', 'gapi', 'highgui', 'imgcodecs', 'imgproc',
    'ml', 'objdetect', 'photo', 'python_tests', 'video', 'videoio',
    // olds:
    'videostab', 'face', 'text', 'tracking', 'xfeatures2d', 'ximgproc',
]
