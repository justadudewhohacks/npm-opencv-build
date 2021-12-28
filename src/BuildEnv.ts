import fs from 'fs';
import os from 'os';
import path from 'path';
import * as utils from './utils.js';
import log from 'npmlog';
import { highlight } from './utils';
import crypto from 'crypto';
import { AutoBuildFile, EnvSummery } from './types.js';

/**
 * options as usable in opencv4nodejs section from package.json
 * Middle priority values
 */
export interface OpenCVPackageBuildOptions {
    autoBuildBuildCuda?: string;
    autoBuildFlags?: string;
    autoBuildOpencvVersion?: string;
    autoBuildWithoutContrib?: string;
    disableAutoBuild?: string;
    opencvIncludeDir?: string;
    opencvLibDir?: string;
    opencvBinDir?: string;
}

/**
 * options passed to OpenCVBuildEnv constructor
 * highest priority values
 */
export interface OpenCVParamBuildOptions {
    // is defined find a working local prbuild version
    // latestBuild: latest build Date
    // latestVersion: higthest version number
    prebuild?: 'latestBuild' | 'latestVersion' | 'oldestBuild' | 'oldestVersion',
    autoBuildOpencvVersion?: string;
    autoBuildBuildCuda?: boolean;
    autoBuildWithoutContrib?: boolean;
    disableAutoBuild?: boolean;
    autoBuildFlags?: string;
    rootcwd?: string;
    opencvIncludeDir?: string;
    opencvLibDir?: string;
    opencvBinDir?: string;
}

type CommonKey = keyof OpenCVParamBuildOptions & keyof OpenCVPackageBuildOptions;

export class OpenCVBuildEnv {
    public opencvVersion: string;
    public buildWithCuda: boolean = false;
    public isWithoutContrib: boolean = false;
    public isAutoBuildDisabled: boolean = false;
    // root path to look for package.json opencv4nodejs section
    // deprecated directly infer your parameters to the constructor
    public autoBuildFlags: string;
    public rootcwd: string;

    private resolveValue(opts: OpenCVParamBuildOptions, packageEnv: OpenCVPackageBuildOptions, key: CommonKey, envName: string): string {
        if (key in opts) {
            if (typeof opts[key] === 'boolean') {
                return opts[key] ? '1' : '';
            } else
                return opts[key] as string || '';
        } else {
            if (packageEnv[key]) {
                return packageEnv[key] || '';
            } else {
                return process.env[envName] || '';
            }
        }
    }

    constructor(opts?: OpenCVParamBuildOptions) {
        opts = opts || {};
        const DEFAULT_OPENCV_VERSION = '3.4.6'
        this.rootcwd = opts.rootcwd || process.env.INIT_CWD || process.cwd()
        if (opts.prebuild) {
            const builds = this.listBuild();
            if (!builds.length) {
                throw Error('no build found');
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
            const autoBuildFile = this.readAutoBuildFile2(builds[0].autobuild);
            if (!autoBuildFile)
                throw Error('failed to read build info from ' + builds[0].autobuild);
            this.autoBuildFlags = autoBuildFile.env.autoBuildFlags;
            this.buildWithCuda = autoBuildFile.env.buildWithCuda;
            this.isAutoBuildDisabled = autoBuildFile.env.isAutoBuildDisabled;
            this.isWithoutContrib = autoBuildFile.env.isWithoutContrib;
            this.opencvVersion = autoBuildFile.env.opencvVersion;
            if (!this.opencvVersion) {
                throw Error('autobuild file is corrupted, opencvVersion is missing in ' + builds[0].autobuild);
            }
            process.env.OPENCV_BIN_DIR = autoBuildFile.env.OPENCV_BIN_DIR;
            process.env.OPENCV_INCLUDE_DIR = autoBuildFile.env.OPENCV_INCLUDE_DIR;
            process.env.OPENCV_LIB_DIR = autoBuildFile.env.OPENCV_LIB_DIR;
            return;
        }


        // get project Root path to looks for package.json for opencv4nodejs section
        let packageEnv: OpenCVPackageBuildOptions = {};
        try {
            packageEnv = this.readEnvsFromPackageJson()
        } catch (err) {
            log.error('applyEnvsFromPackageJson', 'failed to parse package.json:')
            log.error('applyEnvsFromPackageJson', err)
        }

        this.opencvVersion = this.resolveValue(opts, packageEnv, 'autoBuildOpencvVersion', 'OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION');
        if (!this.opencvVersion) {
            this.opencvVersion = DEFAULT_OPENCV_VERSION;
            log.info('init', `no openCV version given using default verison ${utils.formatNumber(DEFAULT_OPENCV_VERSION)}`)
        } else {
            log.info('init', `using openCV verison ${utils.formatNumber(this.opencvVersion)}`)
        }

        if (process.env.INIT_CWD) {
            log.info('init', `${utils.highlight("INIT_CWD")} is defined overwriting root path to  ${utils.highlight(process.env.INIT_CWD)}`)
        }
        if (!fs.existsSync(this.rootcwd)) {
            throw new Error(`${this.rootcwd} does not exist`)
        }

        const envKeys = Object.keys(packageEnv)
        if (envKeys.length) {
            log.info('applyEnvsFromPackageJson', 'the following opencv4nodejs environment variables are set in the package.json:')
            envKeys.forEach((key: keyof OpenCVPackageBuildOptions) => log.info('applyEnvsFromPackageJson', `${highlight(key)}: ${utils.formatNumber(packageEnv[key] || '')}`))
        }

        this.autoBuildFlags = this.resolveValue(opts, packageEnv, 'autoBuildFlags', 'OPENCV4NODEJS_AUTOBUILD_FLAGS');
        this.buildWithCuda = !!this.resolveValue(opts, packageEnv, 'autoBuildBuildCuda', 'OPENCV4NODEJS_BUILD_CUDA');
        this.isWithoutContrib = !!this.resolveValue(opts, packageEnv, 'autoBuildWithoutContrib', 'OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB');
        this.isAutoBuildDisabled = !!this.resolveValue(opts, packageEnv, 'disableAutoBuild', 'OPENCV4NODEJS_DISABLE_AUTOBUILD');

        const OPENCV_INCLUDE_DIR = this.resolveValue(opts, packageEnv, 'opencvIncludeDir', 'OPENCV_INCLUDE_DIR');
        if (OPENCV_INCLUDE_DIR && process.env.OPENCV_INCLUDE_DIR !== OPENCV_INCLUDE_DIR) {
            process.env.OPENCV_INCLUDE_DIR = OPENCV_INCLUDE_DIR;
        }
        const OPENCV_LIB_DIR = this.resolveValue(opts, packageEnv, 'opencvLibDir', 'OPENCV_LIB_DIR');
        if (OPENCV_LIB_DIR && process.env.OPENCV_LIB_DIR !== OPENCV_LIB_DIR) {
            process.env.OPENCV_LIB_DIR = OPENCV_LIB_DIR;
        }

        const OPENCV_BIN_DIR = this.resolveValue(opts, packageEnv, 'opencvBinDir', 'OPENCV_BIN_DIR');
        if (OPENCV_BIN_DIR && process.env.OPENCV_BIN_DIR !== OPENCV_BIN_DIR) {
            process.env.OPENCV_BIN_DIR = OPENCV_BIN_DIR;
        }
    }

    public dumpEnv(): EnvSummery {
        return {
            opencvVersion: this.opencvVersion,
            buildWithCuda: this.buildWithCuda,
            isWithoutContrib: this.isWithoutContrib,
            isAutoBuildDisabled: this.isAutoBuildDisabled,
            autoBuildFlags: this.autoBuildFlags,
            OPENCV_INCLUDE_DIR: process.env.OPENCV_INCLUDE_DIR || '',
            OPENCV_LIB_DIR: process.env.OPENCV_LIB_DIR || '',
            OPENCV_BIN_DIR: process.env.OPENCV_BIN_DIR || '',
        }
    }

    public get opencvIncludeDir(): string {
        return process.env.OPENCV_INCLUDE_DIR || '';
    }

    // public get opencvLibDir(): string {
    //     return process.env.OPENCV_LIB_DIR || '';
    // }

    // public get opencvBinDir(): string {
    //     return process.env.OPENCV_BIN_DIR || '';
    // }


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
    private parsePackageJson(): { file: string, data: any } | null {
        const absPath = path.resolve(this.rootcwd, 'package.json')
        if (!fs.existsSync(absPath)) {
            return null
        }
        log.info('config', `looking for opencv4nodejs option from ${highlight("%s")}`, absPath);
        const data = JSON.parse(fs.readFileSync(absPath).toString())
        return { file: absPath, data };
    }

    public numberOfCoresAvailable(): number { return os.cpus().length }

    /**
     * get opencv4nodejs section from package.json if available
     * @returns opencv4nodejs customs
     */
    private readEnvsFromPackageJson(): { [key: string]: string | boolean | number } {
        const rootPackageJSON = this.parsePackageJson()
        if (rootPackageJSON && rootPackageJSON.data) {
            if (rootPackageJSON.data.opencv4nodejs) {
                log.info('config', `found opencv4nodejs section in ${highlight(rootPackageJSON.file)}`);
                return rootPackageJSON.data.opencv4nodejs
            } else {
                log.info('config', `no opencv4nodejs section found in ${highlight(rootPackageJSON.file)}`);
            }
        }
        return {};
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

    get rootDir(): string {
        // const __filename = fileURLToPath(import.meta.url);
        // const __dirname = dirname(__filename);
        return path.resolve(__dirname, '../');
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
        return path.join(this.opencvInclude, 'opencv4')
    }
    get opencvLibDir(): string {
        return utils.isWin() ? path.join(this.opencvBuild, 'lib/Release') : path.join(this.opencvBuild, 'lib')
    }
    get opencvBinDir(): string {
        return utils.isWin() ? path.join(this.opencvBuild, 'bin/Release') : path.join(this.opencvBuild, 'bin')
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