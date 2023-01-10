import fs, { Stats } from 'fs';
import os from 'os';
import path from 'path';
import log from 'npmlog';
import { highlight, formatNumber, isCudaAvailable } from './utils.js';
import crypto from 'crypto';
import { AutoBuildFile, EnvSummery } from './types.js';
import { ALLARGS, ArgInfo, MODEULES_MAP, OpenCVBuildEnvParams, OpenCVBuildEnvParamsBool, OpenCVBuildEnvParamsString, OpencvModulesType, OpenCVPackageBuildOptions, OPENCV_PATHS_ENV } from './misc.js';
import { ALL_OPENCV_MODULES } from './misc.js';
import { sync as blob } from '@u4/tiny-glob';

function toBool(value?: string | null) {
    if (!value)
        return false;
    if (typeof value === 'boolean')
        return value;
    value = value.toLowerCase();
    if (value === '0' || value === 'false' || value === 'off' || value.startsWith('disa'))
        return false;
    return true;
}

const DEFAULT_OPENCV_VERSION = '4.6.0';

export default class OpenCVBuildEnv implements OpenCVBuildEnvParamsBool, OpenCVBuildEnvParamsString {
    public prebuild?: 'latestBuild' | 'latestVersion' | 'oldestBuild' | 'oldestVersion';
    /**
     * set using env OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION , or --version or autoBuildOpencvVersion option in package.json
     */
    public opencvVersion: string;
    /**
     * set using env OPENCV4NODEJS_BUILD_CUDA , or --cuda or autoBuildBuildCuda option in package.json
     */
    public buildWithCuda = false;
    #cudaArch = '';

    get cudaArch(): string {
        const arch = this.#cudaArch;
        if (!arch)
            return '';
        if (!arch.match(/^(\d+\.\d+)(,\d+\.\d+)*$/))
            throw Error(`invalid value for cudaArch "${arch}" should be a list of valid cuda arch separated by comma like: "7.5,8.6"`)
        return arch;
    }
    /**
     * set using env OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB, or --nocontrib arg, or autoBuildWithoutContrib option in package.json
     */
    public isWithoutContrib = false;
    /**
     * set using env OPENCV4NODEJS_DISABLE_AUTOBUILD, or --nobuild arg or disableAutoBuild option in package.json
     */
    public isAutoBuildDisabled = false;
    /**
     * set using --keepsources arg or keepsources option in package.json
     */
    public keepsources = false;
    /**
     * set using --dry-run arg or dry-run option in package.json
     */
    public dryRun = false;
    public gitCache = false;
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
    private no_autobuild: string;

    /**
     * Find the proper root dir, this directory will contains all openCV source code and a subfolder per build
     * @param opts 
     * @returns 
     */
    public static getBuildDir(opts = {} as OpenCVBuildEnvParams) {
        let buildRoot = opts.buildRoot || process.env.OPENCV_BUILD_ROOT || path.join(__dirname, '..')
        if (buildRoot[0] === '~') {
            buildRoot = path.join(os.homedir(), buildRoot.slice(1));
        }
        return buildRoot;
    }

    /**
     * list existing build in the diven directory
     * @param rootDir build directory
     * @returns builds list
     */
    public static listBuild(rootDir: string): Array<{ autobuild: string, buildInfo: AutoBuildFile, dir: string, hash: string, date: Date }> {
        const versions = fs.readdirSync(rootDir)
            .filter(n => n.startsWith('opencv-'))
            .map((dir) => {
                const autobuild = path.join(rootDir, dir, 'auto-build.json');
                const hash = dir.replace(/^opencv-.+-/, '-');
                const buildInfo = OpenCVBuildEnv.readAutoBuildFile(autobuild, true) as AutoBuildFile;
                return { autobuild, dir, hash, buildInfo, date: fs.statSync(autobuild).mtime }
            })
            .filter((n) => n.buildInfo)
        return versions;
    }

    /**
     * Read a parse an existing autoBuildFile
     * @param autoBuildFile file path
     * @returns 
     */
    public static readAutoBuildFile(autoBuildFile: string, quiet?: boolean): AutoBuildFile | undefined {
        try {
            const fileExists = fs.existsSync(autoBuildFile)
            if (fileExists) {
                const autoBuildFileData = JSON.parse(fs.readFileSync(autoBuildFile).toString()) as AutoBuildFile
                if (!autoBuildFileData.opencvVersion || !('autoBuildFlags' in autoBuildFileData) || !Array.isArray(autoBuildFileData.modules)) {
                    // if (quiet) return undefined;
                    throw new Error(`auto-build.json has invalid contents, please delete the file: ${autoBuildFile}`);
                }
                return autoBuildFileData
            }
            if (!quiet) log.info('readAutoBuildFile', 'file does not exists: %s', autoBuildFile)
        } catch (err) {
            //if (!quiet) 
            log.error('readAutoBuildFile', 'failed to read auto-build.json from: %s, with error: %s', autoBuildFile, err.toString())
        }
        return undefined
    }


    /**
     * autodetect path using common values.
     * @return number of updated env variable from 0 to 3
     */
    public static autoLocatePrebuild(): { changes: number, summery: string[] } {
        let changes = 0;
        const summery = [] as string[];
        const os = process.platform;
        if (os === "win32") {
            // chocolatey
            if (!process.env.OPENCV_BIN_DIR) {
                const candidate = "c:\\tools\\opencv\\build\\x64\\vc14\\bin";
                if (fs.existsSync(candidate)) {
                    process.env.OPENCV_BIN_DIR = candidate;
                    summery.push('OPENCV_BIN_DIR resolved');
                    changes++;
                } else {
                    summery.push(`failed to resolve OPENCV_BIN_DIR from ${candidate}`);
                }

            }
            if (!process.env.OPENCV_LIB_DIR) {
                const candidate = "c:\\tools\\opencv\\build\\x64\\vc14\\lib"
                if (fs.existsSync(candidate)) {
                    process.env.OPENCV_LIB_DIR = candidate;
                    summery.push('OPENCV_LIB_DIR resolved');
                    changes++;
                } else {
                    summery.push(`failed to resolve OPENCV_LIB_DIR from ${candidate}`);
                }
            }
            if (!process.env.OPENCV_INCLUDE_DIR) {
                const candidate = "c:\\tools\\opencv\\build\\include"
                if (fs.existsSync(candidate)) {
                    process.env.OPENCV_INCLUDE_DIR = candidate;
                    summery.push('OPENCV_INCLUDE_DIR resolved');
                    changes++;
                } else {
                    summery.push(`failed to resolve OPENCV_INCLUDE_DIR from ${candidate}`);
                }
            }
        } else if (os === 'linux') {
            // apt detection
            if (!process.env.OPENCV_BIN_DIR) {
                const candidate = "/usr/bin/";
                if (fs.existsSync(candidate)) {
                    process.env.OPENCV_BIN_DIR = candidate;
                    summery.push('OPENCV_BIN_DIR resolved');
                    changes++;
                } else {
                    summery.push(`failed to resolve OPENCV_BIN_DIR from ${candidate}`);
                }
            }
            if (!process.env.OPENCV_LIB_DIR) {
                const lookup = "/usr/lib/*-linux-gnu";
                // tiny-blob need to be fix bypassing th issue
                const [candidate] = fs.readdirSync('/usr/lib/').filter((a: string) => a.endsWith('-linux-gnu')).map(a => `/usr/lib/${a}`);
                // const candidates = blob(lookup);
                if (candidate) {
                    process.env.OPENCV_LIB_DIR = candidate;
                    summery.push(`OPENCV_LIB_DIR resolved`);
                    changes++;
                } else {
                    summery.push(`failed to resolve OPENCV_LIB_DIR from ${lookup}`);
                }
            }
            if (!process.env.OPENCV_INCLUDE_DIR) {
                const candidate = "/usr/include/opencv4/"
                if (fs.existsSync(candidate)) {
                    process.env.OPENCV_INCLUDE_DIR = candidate;
                    summery.push('OPENCV_INCLUDE_DIR resolved');
                    changes++;
                } else {
                    summery.push(`failed to resolve OPENCV_INCLUDE_DIR from ${candidate}`);
                }
            }
        } else if (os === 'darwin') {
            // Brew detection
            if (fs.existsSync("/opt/homebrew/Cellar/opencv")) {
                const lookup = "/opt/homebrew/Cellar/opencv/*";
                const candidates = blob(lookup);
                if (candidates.length > 1) {
                    summery.push(`homebrew detection found more than one openCV setup: ${candidates.join(',')} using only the first one`);
                }
                if (candidates.length) {
                    const dir = candidates[0];
                    if (!process.env.OPENCV_BIN_DIR) {
                        const candidate = path.join(dir, "bin");
                        if (fs.existsSync(candidate)) {
                            process.env.OPENCV_BIN_DIR = candidate;
                            summery.push("OPENCV_BIN_DIR resolved");
                            changes++;
                        } else {
                            summery.push(`failed to resolve OPENCV_BIN_DIR from ${lookup}/bin`);
                        }
                    }
                    if (!process.env.OPENCV_LIB_DIR) {
                        const candidate = path.join(dir, "lib");
                        if (fs.existsSync(candidate)) {
                            process.env.OPENCV_LIB_DIR = candidate;
                            summery.push(`OPENCV_LIB_DIR resolved`);
                            changes++;
                        } else {
                            summery.push(`failed to resolve OPENCV_BIN_DIR from ${lookup}/lib`);
                        }
                    }
                    if (!process.env.OPENCV_INCLUDE_DIR) {
                        const candidate = path.join(dir, "include");
                        if (fs.existsSync(candidate)) {
                            process.env.OPENCV_INCLUDE_DIR = candidate;
                            summery.push('OPENCV_INCLUDE_DIR resolve');
                            changes++;
                        } else {
                            summery.push(`failed to resolve OPENCV_INCLUDE_DIR from ${lookup}/include`);
                        }
                    }
                }
            }
        }
        return { changes, summery };
    }


    private getExpectedVersion(): string {
        if (this.no_autobuild) {
            return '0.0.0';
        }
        const opencvVersion = this.resolveValue(ALLARGS.version);
        if (opencvVersion)
            return opencvVersion;
        return DEFAULT_OPENCV_VERSION;
    }

    // private getExpectedBuildWithCuda(): boolean {
    //     return !!this.resolveValue(ALLARGS.cuda);
    // }
    // this.autoBuildFlags = this.resolveValue(ALLARGS.flags);
    // this.#cudaArch = this.resolveValue(ALLARGS.cudaArch);
    // this.isWithoutContrib = !!this.resolveValue(ALLARGS.nocontrib);
    // this.isAutoBuildDisabled = !!this.resolveValue(ALLARGS.nobuild);
    // this.keepsources = !!this.resolveValue(ALLARGS.keepsources);
    // this.dryRun = !!this.resolveValue(ALLARGS['dry-run']);
    // this.gitCache = !!this.resolveValue(ALLARGS['git-cache']);

    private resolveValue(info: ArgInfo): string {
        let value = '';
        if (info.conf in this.opts) {
            value = this.opts[info.conf] as string || '';
        } else {
            if (this.#packageEnv && this.#packageEnv[info.conf]) {
                value = this.#packageEnv[info.conf] || '';
            } else {
                value = process.env[info.env] || '';
            }
        }
        if (info.isBool) {
            return toBool(value) ? '1' : '';
        } else {
            return value;
        }
    }
    #packageEnv: OpenCVPackageBuildOptions = {};

    constructor(private opts = {} as OpenCVBuildEnvParams) {
        this.prebuild = opts.prebuild;
        this._platform = process.platform;
        this.packageRoot = opts.rootcwd || process.env.INIT_CWD || process.cwd();
        this.buildRoot = OpenCVBuildEnv.getBuildDir(opts);
        // get project Root path to looks for package.json for opencv4nodejs section
        try {
            const data = OpenCVBuildEnv.readEnvsFromPackageJson();
            if (data === null && !this.prebuild) {
                log.info('config', `No file ${highlight("%s")} found for opencv4nodejs import`, OpenCVBuildEnv.getPackageJson());
            }
            if (data)
                this.#packageEnv = data
        } catch (err) {
            log.error('applyEnvsFromPackageJson', 'failed to parse package.json:')
            log.error('applyEnvsFromPackageJson', err)
        }
        // try to use previouse build
        this.no_autobuild = toBool(this.resolveValue(ALLARGS.nobuild)) ? '1' : '';
        if (!this.no_autobuild && opts.prebuild) {
            let builds = OpenCVBuildEnv.listBuild(this.rootDir);
            if (!builds.length) {
                throw Error(`No build found in ${this.rootDir} you should launch opencv-build-npm once`);
            }
            const expVer = this.getExpectedVersion();
            builds = builds.filter(b => b.buildInfo.opencvVersion === expVer)
            if (!builds.length) {
                throw Error(`No build of version ${expVer} found in ${this.rootDir} you should launch opencv-build-npm`);
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
            const autoBuildFile = builds[0].buildInfo;
            //const autoBuildFile = OpenCVBuildEnv.readAutoBuildFile(builds[0].autobuild);
            //if (!autoBuildFile)
            //    throw Error(`failed to read build info from ${builds[0].autobuild}`);
            const flagStr = autoBuildFile.env.autoBuildFlags;
            this.hash = builds[0].hash;
            // merge -DBUILD_opencv_ to internal BUILD_opencv_ manager
            if (flagStr) {
                const flags = flagStr.split(' ')
                flags.filter(flag => {
                    if (flag.startsWith('-DBUILD_opencv_')) {
                        // eslint-disable-next-line prefer-const
                        let [mod, activated] = flag.substring(15).split('=');
                        activated = activated.toUpperCase();
                        if (activated === 'ON' || activated === '1') {
                            this.#enabledModules.add(mod as OpencvModulesType);
                        } else if (activated === 'OFF' || activated === '0') {
                            this.#enabledModules.delete(mod as OpencvModulesType);
                        }
                        return false;
                    }
                    return true;
                });
            }
            this.autoBuildFlags = flagStr;
            this.buildWithCuda = autoBuildFile.env.buildWithCuda;
            this.isAutoBuildDisabled = autoBuildFile.env.isAutoBuildDisabled;
            this.isWithoutContrib = autoBuildFile.env.isWithoutContrib;
            this.opencvVersion = autoBuildFile.env.opencvVersion;
            this.buildRoot = autoBuildFile.env.buildRoot;
            if (!this.opencvVersion) {
                throw Error(`autobuild file is corrupted, opencvVersion is missing in ${builds[0].autobuild}`);
            }
            process.env.OPENCV_BIN_DIR = autoBuildFile.env.OPENCV_BIN_DIR;
            process.env.OPENCV_INCLUDE_DIR = autoBuildFile.env.OPENCV_INCLUDE_DIR;
            process.env.OPENCV_LIB_DIR = autoBuildFile.env.OPENCV_LIB_DIR;

            if (this.buildWithCuda && isCudaAvailable()) {
                this.#enabledModules.add('cudaarithm');
                this.#enabledModules.add('cudabgsegm');
                this.#enabledModules.add('cudacodec');
                this.#enabledModules.add('cudafeatures2d');
                this.#enabledModules.add('cudafilters');
                this.#enabledModules.add('cudaimgproc');
                // this.#enabledModules.add('cudalegacy');
                this.#enabledModules.add('cudaobjdetect');
                this.#enabledModules.add('cudaoptflow');
                this.#enabledModules.add('cudastereo');
                this.#enabledModules.add('cudawarping');
            }
            return;
        }
        // try to build a new openCV or use a prebuilt one
        if (this.no_autobuild) {
            this.opencvVersion = '0.0.0';
            OpenCVBuildEnv.autoLocatePrebuild();
        } else {
            this.opencvVersion = this.getExpectedVersion();
            log.info('init', `using openCV verison ${formatNumber(this.opencvVersion)}`)

            if (process.env.INIT_CWD) {
                log.info('init', `${highlight("INIT_CWD")} is defined overwriting root path to ${highlight(process.env.INIT_CWD)}`)
            }
            // ensure that OpenCV workdir exists
            if (!fs.existsSync(this.buildRoot)) {
                fs.mkdirSync(this.buildRoot);
                if (!fs.existsSync(this.buildRoot)) {
                    throw new Error(`${this.buildRoot} can not be create`)
                }
            }
        }

        // import configuration from package.json
        const envKeys = Object.keys(this.#packageEnv)
        if (envKeys.length) {
            // print all imported variables
            log.info('applyEnvsFromPackageJson', 'the following opencv4nodejs environment variables are set in the package.json:')
            envKeys.forEach((key: keyof OpenCVPackageBuildOptions) => log.info('applyEnvsFromPackageJson', `${highlight(key)}: ${formatNumber(this.#packageEnv[key] || '')}`))
        }

        this.autoBuildFlags = this.resolveValue(ALLARGS.flags);
        this.buildWithCuda = !!this.resolveValue(ALLARGS.cuda);
        this.#cudaArch = this.resolveValue(ALLARGS.cudaArch);
        this.isWithoutContrib = !!this.resolveValue(ALLARGS.nocontrib);
        this.isAutoBuildDisabled = !!this.resolveValue(ALLARGS.nobuild);
        this.keepsources = !!this.resolveValue(ALLARGS.keepsources);
        this.dryRun = !!this.resolveValue(ALLARGS['dry-run']);
        this.gitCache = !!this.resolveValue(ALLARGS['git-cache']);

        if (this.buildWithCuda && isCudaAvailable()) {
            this.#enabledModules.add('cudaarithm');
            this.#enabledModules.add('cudabgsegm');
            this.#enabledModules.add('cudacodec');
            this.#enabledModules.add('cudafeatures2d');
            this.#enabledModules.add('cudafilters');
            this.#enabledModules.add('cudaimgproc');
            // this.#enabledModules.add('cudalegacy');
            this.#enabledModules.add('cudaobjdetect');
            this.#enabledModules.add('cudaoptflow');
            this.#enabledModules.add('cudastereo');
            this.#enabledModules.add('cudawarping');
        }
    }

    #ready = false;
    /**
     * complet initialisation.
     */
    private getReady(): void {
        if (this.#ready)
            return;
        this.#ready = true;
        for (const varname of ['binDir', 'incDir', 'libDir']) {
            const varname2 = varname as 'binDir' | 'incDir' | 'libDir';
            const value = this.resolveValue(ALLARGS[varname2]);
            if (value && process.env[varname] !== value) {
                process.env[ALLARGS[varname2].env] = value;
            }
        }
        if (this.no_autobuild) {
            /**
             * no autobuild, all OPENCV_PATHS_ENV should be defined
             */
            for (const varname of OPENCV_PATHS_ENV) {
                const value = process.env[varname];
                if (!value) {
                    throw new Error(`${varname} must be define if auto-build is disabled, and autodetection failed`);
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

    /** default module build list */
    #enabledModules = new Set<OpencvModulesType>(Object.entries(MODEULES_MAP).filter(([, v]) => v).map(([k]) => k as OpencvModulesType));

    public get enabledModules(): OpencvModulesType[] {
        return [...this.#enabledModules];
    }

    public enableModule(mod: OpencvModulesType) {
        if (this.#ready)
            throw Error('No mode modules change can be done after initialisation done.');
        this.#enabledModules.add(mod);
    }

    public disableModule(mod: OpencvModulesType) {
        if (this.#ready)
            throw Error('No mode modules change can be done after initialisation done.');
        this.#enabledModules.delete(mod);
    }

    /**
     * @returns return cmake flags like: -DBUILD_opencv_modules=ON ...
     */
    public getCmakeBuildFlags(): string[] {
        const out: string[] = [];
        for (const mod of ALL_OPENCV_MODULES) {
            const value = this.#enabledModules.has(mod) ? 'ON' : 'OFF';
            if (value === 'OFF' && MODEULES_MAP[mod] === null)
                continue;
            out.push(`-DBUILD_opencv_${mod}=${value}`);
        }
        return out.sort();
    }

    // if version < 4.5.6 ffmpeg 5 not compatible
    // https://stackoverflow.com/questions/71070080/building-opencv-from-source-in-mac-m1
    // brew install ffmpeg@4
    // brew unlink ffmpeg
    // brew link ffmpeg@4

    public getSharedCmakeFlags(): string[] {
        const cMakeflags = [
            `-DCMAKE_INSTALL_PREFIX=${this.opencvBuild}`,
            '-DCMAKE_BUILD_TYPE=Release',
            '-DCMAKE_BUILD_TYPES=Release',
            '-DBUILD_EXAMPLES=OFF', // do not build opencv_contrib samples
            '-DBUILD_DOCS=OFF',
            '-DBUILD_TESTS=OFF',
            '-DBUILD_opencv_dnn=ON', // added 28/12/2022
            '-DENABLE_FAST_MATH=ON',
            '-DBUILD_PERF_TESTS=OFF',
            '-DBUILD_JAVA=OFF',
            '-DBUILD_ZLIB=OFF', // https://github.com/opencv/opencv/issues/21389
            '-DCUDA_NVCC_FLAGS=--expt-relaxed-constexpr',
            '-DWITH_VTK=OFF',
        ]
        if (!this.isWithoutContrib)
            cMakeflags.push('-DOPENCV_ENABLE_NONFREE=ON', `-DOPENCV_EXTRA_MODULES_PATH=${this.opencvContribModules}`);
        cMakeflags.push(... this.getCongiguredCmakeFlags());
        return cMakeflags;
        // .cMakeflags.push('-DCMAKE_SYSTEM_PROCESSOR=arm64', '-DCMAKE_OSX_ARCHITECTURES=arm64');
    }

    public getCongiguredCmakeFlags(): string[] {
        const cMakeflags = [];
        if (this.buildWithCuda) {
            if (isCudaAvailable()) {
                // log.info('install', 'Adding CUDA flags...');
                // this.enabledModules.delete('cudacodec');// video codec (NVCUVID) is deprecated in cuda 10, so don't add it
                cMakeflags.push('-DWITH_CUDA=ON', '-DCUDA_FAST_MATH=ON'/* optional */, '-DWITH_CUBLAS=ON' /* optional */, "-DOPENCV_DNN_CUDA=ON")

                this.#enabledModules.add('cudaarithm');
                this.#enabledModules.add('cudabgsegm');
                this.#enabledModules.add('cudacodec');
                this.#enabledModules.add('cudafeatures2d');
                this.#enabledModules.add('cudafilters');
                this.#enabledModules.add('cudaimgproc');
                // this.#enabledModules.add('cudalegacy');
                this.#enabledModules.add('cudaobjdetect');
                this.#enabledModules.add('cudaoptflow');
                this.#enabledModules.add('cudastereo');
                this.#enabledModules.add('cudawarping');

                const cudaArch = this.cudaArch;
                if (cudaArch) {
                    cMakeflags.push(`-DCUDA_ARCH_BIN=${cudaArch}`)
                }
            } else {
                log.error('install', 'failed to locate CUDA setup');
            }
        }
        cMakeflags.push(...this.getCmakeBuildFlags());
        // add user added flags
        if (this.autoBuildFlags && typeof (this.autoBuildFlags) === 'string' && this.autoBuildFlags.length) {
            // log.silly('install', 'using flags from OPENCV4NODEJS_AUTOBUILD_FLAGS:', this.autoBuildFlags)
            cMakeflags.push(...this.autoBuildFlags.split(' '));
        }
        // console.log(cMakeflags)
        return cMakeflags;
    }

    public dumpEnv(): EnvSummery {
        return {
            opencvVersion: this.opencvVersion,
            buildWithCuda: this.buildWithCuda,
            isWithoutContrib: this.isWithoutContrib,
            isAutoBuildDisabled: this.isAutoBuildDisabled,
            autoBuildFlags: this.autoBuildFlags,
            cudaArch: this.cudaArch,
            buildRoot: this.buildRoot,
            OPENCV_INCLUDE_DIR: process.env.OPENCV_INCLUDE_DIR || '',
            OPENCV_LIB_DIR: process.env.OPENCV_LIB_DIR || '',
            OPENCV_BIN_DIR: process.env.OPENCV_BIN_DIR || '',
            modules: [...this.#enabledModules].sort(),
        }
    }

    private static getPackageJson(): string {
        return path.resolve(process.cwd(), 'package.json');
    }

    /**
     * extract opencv4nodejs section from package.json if available
     */
    private static parsePackageJson(): { file: string, data: { opencv4nodejs?: { [key: string]: string | boolean | number } } } | null {
        const absPath = OpenCVBuildEnv.getPackageJson();
        if (!fs.existsSync(absPath)) {
            return null
        }
        const data = JSON.parse(fs.readFileSync(absPath).toString())
        return { file: absPath, data };
    }

    public numberOfCoresAvailable(): number { return os.cpus().length }

    private static readEnvsFromPackageJsonLog = 0
    /**
     * get opencv4nodejs section from package.json if available
     * @returns opencv4nodejs customs
     */
    public static readEnvsFromPackageJson(): { [key: string]: string | boolean | number } | null {
        const rootPackageJSON = OpenCVBuildEnv.parsePackageJson()
        if (!rootPackageJSON) {
            return null;
        }

        if (!rootPackageJSON.data) {
            if (!OpenCVBuildEnv.readEnvsFromPackageJsonLog++)
                log.info('config', `looking for opencv4nodejs option from ${highlight("%s")}`, rootPackageJSON.file);
            return {}
        }
        if (!rootPackageJSON.data.opencv4nodejs) {
            if (!OpenCVBuildEnv.readEnvsFromPackageJsonLog++)
                log.info('config', `no opencv4nodejs section found in ${highlight('%s')}`, rootPackageJSON.file);
            return {};
        }
        if (!OpenCVBuildEnv.readEnvsFromPackageJsonLog++)
            log.info('config', `found opencv4nodejs section in ${highlight('%s')}`, rootPackageJSON.file);
        return rootPackageJSON.data.opencv4nodejs
    }
    private hash = '';
    /**
     * openCV uniq version prostfix, used to avoid build path colision.
     */
    get optHash(): string {
        if (this.hash)
            return this.hash;
        let optArgs = this.getCongiguredCmakeFlags().join(' ');
        if (this.buildWithCuda) optArgs += 'cuda'
        if (this.isWithoutContrib) optArgs += 'noContrib'
        if (optArgs) {
            optArgs = '-' + crypto.createHash('md5').update(optArgs).digest('hex').substring(0, 5);
        }
        return optArgs;
    }

    public get platform(): NodeJS.Platform {
        return this._platform;
    }

    public get isWin(): boolean {
        return this.platform === 'win32'
    }

    public get rootDir(): string {
        // const __filename = fileURLToPath(import.meta.url);
        // const __dirname = dirname(__filename);
        // return path.resolve(__dirname, '../');
        return this.buildRoot;
    }
    public get opencvRoot(): string {
        return path.join(this.rootDir, `opencv-${this.opencvVersion}${this.optHash}`)
    }

    public get opencvGitCache(): string {
        return path.join(this.rootDir, 'opencvGit')
    }

    public get opencvContribGitCache(): string {
        return path.join(this.rootDir, 'opencv_contribGit')
    }

    public get opencvSrc(): string {
        return path.join(this.opencvRoot, 'opencv')
    }
    public get opencvContribSrc(): string {
        return path.join(this.opencvRoot, 'opencv_contrib')
    }
    public get opencvContribModules(): string {
        return path.join(this.opencvContribSrc, 'modules')
    }
    public get opencvBuild(): string {
        return path.join(this.opencvRoot, 'build')
    }
    public get opencvInclude(): string {
        return path.join(this.opencvBuild, 'include')
    }
    public get opencv4Include(): string {
        this.getReady();
        if (process.env.OPENCV_INCLUDE_DIR) return process.env.OPENCV_INCLUDE_DIR;
        return path.join(this.opencvInclude, 'opencv4')
    }
    public get opencvIncludeDir(): string {
        this.getReady();
        return process.env.OPENCV_INCLUDE_DIR || '';
    }
    public get opencvLibDir(): string {
        this.getReady();
        if (process.env.OPENCV_LIB_DIR) return process.env.OPENCV_LIB_DIR;
        return this.isWin ? path.join(this.opencvBuild, 'lib/Release') : path.join(this.opencvBuild, 'lib')
    }
    public get opencvBinDir(): string {
        this.getReady();
        if (process.env.OPENCV_BIN_DIR) return process.env.OPENCV_BIN_DIR;
        return this.isWin ? path.join(this.opencvBuild, 'bin/Release') : path.join(this.opencvBuild, 'bin')
    }
    public get autoBuildFile(): string {
        return path.join(this.opencvRoot, 'auto-build.json')
    }
    public get autoBuildLog(): string {
        if (this.isWin)
            return path.join(this.opencvRoot, 'build-cmd.bat')
        else
            return path.join(this.opencvRoot, 'build-cmd.sh')
    }
    public readAutoBuildFile(): AutoBuildFile | undefined {
        return OpenCVBuildEnv.readAutoBuildFile(this.autoBuildFile);
    }
}
