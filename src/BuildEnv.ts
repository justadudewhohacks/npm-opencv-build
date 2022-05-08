import fs, { Stats } from 'fs';
import os from 'os';
import path from 'path';
import log from 'npmlog';
import { highlight, formatNumber } from './utils';
import crypto from 'crypto';
import { AutoBuildFile, EnvSummery } from './types.js';

/**
 * options passed to OpenCVBuildEnv constructor
 * highest priority values
 */
export interface OpenCVBuildEnvParamsBool {
    autoBuildBuildCuda?: boolean;
    autoBuildWithoutContrib?: boolean;
    disableAutoBuild?: boolean;
    keepsources?: boolean;
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
interface ArgInfo {
    arg: string;
    conf: keyof OpenCVPackageBuildOptions;
    env: string;
    isBool: boolean;
    doc: string;
}

/**
 * arguments data
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
    let out: OpenCVBuildEnvParams = { extra: {} };
    for (let i = 0; i < args.length; i++) {
        let arg = args[i];
        if (arg.startsWith('--')) {
            arg = arg.substring(2);
        } else if (arg.startsWith('--')) {
            arg = arg.substring(2);
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

export class OpenCVBuildEnv implements OpenCVBuildEnvParamsBool, OpenCVBuildEnvParamsString {
    public prebuild?: 'latestBuild' | 'latestVersion' | 'oldestBuild' | 'oldestVersion';
    public opencvVersion: string;
    public buildWithCuda: boolean = false;
    public isWithoutContrib: boolean = false;
    public isAutoBuildDisabled: boolean = false;
    public keepsources: boolean = false;
    // root path to look for package.json opencv4nodejs section
    // deprecated directly infer your parameters to the constructor
    public autoBuildFlags: string;
    // legacy path to package.json dir
    public rootcwd: string;
    // Path to build all openCV libs
    public buildRoot: string;
    // Path to find package.json legacy option
    public packageRoot: string;
    protected _platform: NodeJS.Platform;

    private resolveValue(opts: OpenCVBuildEnvParams, packageEnv: OpenCVPackageBuildOptions | null, info: ArgInfo): string {
        if (info.conf in opts) {
            if (info.isBool) {
                return opts[info.conf] ? '1' : '';
            } else
                return opts[info.conf] as string || '';
        } else {
            if (packageEnv && packageEnv[info.conf]) {
                return packageEnv[info.conf] || '';
            } else {
                return process.env[info.env] || '';
            }
        }
    }

    constructor(opts?: OpenCVBuildEnvParams) {
        opts = opts || {};
        const DEFAULT_OPENCV_VERSION = '4.5.4'
        this.prebuild = opts.prebuild;
        this._platform = process.platform;
        this.packageRoot = opts.rootcwd || process.env.INIT_CWD || process.cwd();
        this.buildRoot = opts.buildRoot || process.env.OPENCV_BUILD_ROOT || path.join(__dirname, '..')
        if (this.buildRoot[0] === '~') {
            this.buildRoot = path.join(os.homedir(), this.buildRoot.slice(1));
        }

        // get project Root path to looks for package.json for opencv4nodejs section
        let packageEnv: OpenCVPackageBuildOptions = {};
        try {
            packageEnv = OpenCVBuildEnv.readEnvsFromPackageJson()
        } catch (err) {
            log.error('applyEnvsFromPackageJson', 'failed to parse package.json:')
            log.error('applyEnvsFromPackageJson', err)
        }

        const no_autobuild = this.resolveValue(opts, packageEnv, ALLARGS.nobuild);

        if (!no_autobuild && opts.prebuild) {
            const builds = this.listBuild();
            if (!builds.length) {
                throw Error(`No build found in ${this.rootDir} you should launch opencv-build-npm once`);
            }
            if (builds.length > 1) {
                switch (opts.prebuild) {
                    case 'latestBuild':
                        builds.sort((a, b) => b.date.getTime() - a.date.getTime());
                        break;
                    case 'latestVersion':
                        builds.sort((a, b) => b.dir.localeCompare(a.dir));
                        break;
                    case 'oldestBuild':
                        builds.sort((a, b) => a.date.getTime() - b.date.getTime());
                        break;
                    case 'oldestVersion':
                        builds.sort((a, b) => a.dir.localeCompare(b.dir));
                        break;
                }
            }
            // load envthe prevuious build
            const autoBuildFile = this.readAutoBuildFile2(builds[0].autobuild);
            if (!autoBuildFile)
                throw Error('failed to read build info from ' + builds[0].autobuild);
            this.autoBuildFlags = autoBuildFile.env.autoBuildFlags;
            this.buildWithCuda = autoBuildFile.env.buildWithCuda;
            this.isAutoBuildDisabled = autoBuildFile.env.isAutoBuildDisabled;
            this.isWithoutContrib = autoBuildFile.env.isWithoutContrib;
            this.opencvVersion = autoBuildFile.env.opencvVersion;
            this.buildRoot = autoBuildFile.env.buildRoot;
            if (!this.opencvVersion) {
                throw Error('autobuild file is corrupted, opencvVersion is missing in ' + builds[0].autobuild);
            }
            process.env.OPENCV_BIN_DIR = autoBuildFile.env.OPENCV_BIN_DIR;
            process.env.OPENCV_INCLUDE_DIR = autoBuildFile.env.OPENCV_INCLUDE_DIR;
            process.env.OPENCV_LIB_DIR = autoBuildFile.env.OPENCV_LIB_DIR;
            return;
        }

        if (no_autobuild) {
            this.opencvVersion = '0.0.0';
        } else {
            this.opencvVersion = this.resolveValue(opts, packageEnv, ALLARGS.version);
            if (!this.opencvVersion) {
                this.opencvVersion = DEFAULT_OPENCV_VERSION;
                log.info('init', `no openCV version given using default verison ${formatNumber(DEFAULT_OPENCV_VERSION)}`)
            } else {
                log.info('init', `using openCV verison ${formatNumber(this.opencvVersion)}`)
            }
            if (process.env.INIT_CWD) {
                log.info('init', `${highlight("INIT_CWD")} is defined overwriting root path to ${highlight(process.env.INIT_CWD)}`)
            }
            if (!fs.existsSync(this.buildRoot)) {
                fs.mkdirSync(this.buildRoot);
                if (!fs.existsSync(this.buildRoot)) {
                    throw new Error(`${this.buildRoot} can not be create`)
                }
            }
        }

        const envKeys = Object.keys(packageEnv)
        if (envKeys.length) {
            log.info('applyEnvsFromPackageJson', 'the following opencv4nodejs environment variables are set in the package.json:')
            envKeys.forEach((key: keyof OpenCVPackageBuildOptions) => log.info('applyEnvsFromPackageJson', `${highlight(key)}: ${formatNumber(packageEnv[key] || '')}`))
        }

        this.autoBuildFlags = this.resolveValue(opts, packageEnv, ALLARGS.flags);
        this.buildWithCuda = !!this.resolveValue(opts, packageEnv, ALLARGS.cuda);
        this.isWithoutContrib = !!this.resolveValue(opts, packageEnv, ALLARGS.nocontrib);
        this.isAutoBuildDisabled = !!this.resolveValue(opts, packageEnv, ALLARGS.nobuild);
        this.keepsources = !!this.resolveValue(opts, packageEnv, ALLARGS.keepsources);

        const OPENCV_INCLUDE_DIR = this.resolveValue(opts, packageEnv, ALLARGS.incDir);
        if (OPENCV_INCLUDE_DIR && process.env.OPENCV_INCLUDE_DIR !== OPENCV_INCLUDE_DIR) {
            process.env.OPENCV_INCLUDE_DIR = OPENCV_INCLUDE_DIR;
        }
        const OPENCV_LIB_DIR = this.resolveValue(opts, packageEnv, ALLARGS.libDir);
        if (OPENCV_LIB_DIR && process.env.OPENCV_LIB_DIR !== OPENCV_LIB_DIR) {
            process.env.OPENCV_LIB_DIR = OPENCV_LIB_DIR;
        }

        const OPENCV_BIN_DIR = this.resolveValue(opts, packageEnv, ALLARGS.binDir);
        if (OPENCV_BIN_DIR && process.env.OPENCV_BIN_DIR !== OPENCV_BIN_DIR) {
            process.env.OPENCV_BIN_DIR = OPENCV_BIN_DIR;
        }

        if (no_autobuild) {
            for (const varname of ['OPENCV_INCLUDE_DIR', 'OPENCV_LIB_DIR', 'OPENCV_BIN_DIR']) {
                const value = process.env[varname];
                if (!value) {
                    throw new Error(`${varname} must be define if can not be create nobuild / disableAutoBuild / OPENCV4NODEJS_DISABLE_AUTOBUILD is set`);
                }
                let stats: Stats;
                try {
                    stats = fs.statSync(value);
                } catch (e) {
                    throw new Error(`${varname} is set to non existing "${value}"`);
                }
                if (!stats.isDirectory()) {
                    throw new Error(`${varname} is set to "${value}", that should be a directory`);
                }
            }
        }

    }

    public dumpEnv(): EnvSummery {
        return {
            opencvVersion: this.opencvVersion,
            buildWithCuda: this.buildWithCuda,
            isWithoutContrib: this.isWithoutContrib,
            isAutoBuildDisabled: this.isAutoBuildDisabled,
            autoBuildFlags: this.autoBuildFlags,
            buildRoot: this.buildRoot,
            OPENCV_INCLUDE_DIR: process.env.OPENCV_INCLUDE_DIR || '',
            OPENCV_LIB_DIR: process.env.OPENCV_LIB_DIR || '',
            OPENCV_BIN_DIR: process.env.OPENCV_BIN_DIR || '',
        }
    }

    public get opencvIncludeDir(): string {
        return process.env.OPENCV_INCLUDE_DIR || '';
    }

    public parseAutoBuildFlags(): string[] {
        const flagStr = this.autoBuildFlags
        if (typeof (flagStr) === 'string' && flagStr.length) {
            log.silly('install', 'using flags from OPENCV4NODEJS_AUTOBUILD_FLAGS:', flagStr)
            return flagStr.split(' ')
        }
        return []
    }

    /**
     * extract opencv4nodejs section from package.json if available
     */
    private static parsePackageJson(): { file: string, data: any } | null {
        // const absPath = path.resolve(this.rootcwd, 'package.json')
        const absPath = path.resolve(process.cwd(), 'package.json')
        if (!fs.existsSync(absPath)) {
            log.info('config', `No file ${highlight("%s")} found for opencv4nodejs import`, absPath);
            return null
        }
        const data = JSON.parse(fs.readFileSync(absPath).toString())
        return { file: absPath, data };
    }

    public numberOfCoresAvailable(): number { return os.cpus().length }

    /**
     * get opencv4nodejs section from package.json if available
     * @returns opencv4nodejs customs
     */
    public static readEnvsFromPackageJson(): { [key: string]: string | boolean | number } {
        const rootPackageJSON = this.parsePackageJson()
        if (!rootPackageJSON) {
            return {}
        }

        if (!rootPackageJSON.data) {
            log.info('config', `looking for opencv4nodejs option from ${highlight("%s")}`, rootPackageJSON.file);
            return {}
        }
        if (!rootPackageJSON.data.opencv4nodejs) {
            log.info('config', `no opencv4nodejs section found in ${highlight('%s')}`, rootPackageJSON.file);
            return {};
        }
        log.info('config', `found opencv4nodejs section in ${highlight('%s')}`, rootPackageJSON.file);
        return rootPackageJSON.data.opencv4nodejs
    }
    /**
     * openCV uniq version prostfix, used to avoid build path colision.
     */
    get optHash(): string {
        let optArgs = this.autoBuildFlags;
        // if (!optArgs) {
        //     log.info('init', `${utils.highlight("OPENCV4NODEJS_AUTOBUILD_FLAGS")} is not defined, No extra flags will be append to the build command`)
        // } else {
        //     log.info('init', `${utils.highlight("OPENCV4NODEJS_AUTOBUILD_FLAGS")} is defined, as ${utils.formatNumber("%s")}`, optArgs);
        // }
        if (this.buildWithCuda) optArgs += 'cuda'
        if (this.isWithoutContrib) optArgs += 'noContrib'
        if (optArgs) {
            optArgs = '-' + crypto.createHash('md5').update(optArgs).digest('hex').substring(0, 5);
        }
        return optArgs;
    }

    public listBuild(): Array<{ autobuild: string, dir: string, date: Date }> {
        const rootDir = this.rootDir;
        const versions = fs.readdirSync(rootDir)
            .filter(n => n.startsWith('opencv-'))
            .map((n) => ({ autobuild: path.join(rootDir, n, 'auto-build.json'), dir: n }))
            .filter((n) => fs.existsSync(n.autobuild))
            .map(({ autobuild, dir }) => ({ autobuild, dir, date: fs.statSync(autobuild).mtime }))
        //fs.existsSync(path.join(rootDir, n, 'auto-build.json')));
        return versions;
    }

    get platform(): NodeJS.Platform {
        return this._platform;
    }

    get isWin(): boolean {
        return this.platform === 'win32'
    }

    get rootDir(): string {
        // const __filename = fileURLToPath(import.meta.url);
        // const __dirname = dirname(__filename);
        // return path.resolve(__dirname, '../');
        return this.buildRoot;
    }
    get opencvRoot(): string {
        return path.join(this.rootDir, `opencv-${this.opencvVersion}${this.optHash}`)
    }
    get opencvSrc(): string {
        return path.join(this.opencvRoot, 'opencv')
    }
    get opencvContribSrc(): string {
        return path.join(this.opencvRoot, 'opencv_contrib')
    }
    get opencvContribModules(): string {
        return path.join(this.opencvContribSrc, 'modules')
    }
    get opencvBuild(): string {
        return path.join(this.opencvRoot, 'build')
    }
    get opencvInclude(): string {
        return path.join(this.opencvBuild, 'include')
    }
    get opencv4Include(): string {
        if (process.env.OPENCV_INCLUDE_DIR) return process.env.OPENCV_INCLUDE_DIR;
        return path.join(this.opencvInclude, 'opencv4')
    }
    get opencvLibDir(): string {
        if (process.env.OPENCV_LIB_DIR) return process.env.OPENCV_LIB_DIR;
        return this.isWin ? path.join(this.opencvBuild, 'lib/Release') : path.join(this.opencvBuild, 'lib')
    }
    get opencvBinDir(): string {
        if (process.env.OPENCV_BIN_DIR) return process.env.OPENCV_BIN_DIR;
        return this.isWin ? path.join(this.opencvBuild, 'bin/Release') : path.join(this.opencvBuild, 'bin')
    }
    get autoBuildFile(): string {
        return path.join(this.opencvRoot, 'auto-build.json')
    }
    public readAutoBuildFile(): AutoBuildFile | undefined {
        return this.readAutoBuildFile2(this.autoBuildFile);
    }

    private readAutoBuildFile2(autoBuildFile: string): AutoBuildFile | undefined {
        try {
            const fileExists = fs.existsSync(autoBuildFile)
            if (fileExists) {
                const autoBuildFileData = JSON.parse(fs.readFileSync(autoBuildFile).toString()) as AutoBuildFile
                if (!autoBuildFileData.opencvVersion || !('autoBuildFlags' in autoBuildFileData) || !Array.isArray(autoBuildFileData.modules)) {
                    throw new Error('auto-build.json has invalid contents')
                }
                return autoBuildFileData
            }
            log.info('readAutoBuildFile', 'file does not exists: %s', autoBuildFile)
        } catch (err) {
            log.error('readAutoBuildFile', 'failed to read auto-build.json from: %s, with error: %s', autoBuildFile, err.toString())
        }
        return undefined
    }



}