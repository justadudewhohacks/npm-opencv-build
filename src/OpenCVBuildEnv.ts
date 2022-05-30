import fs, { Stats } from 'fs';
import os from 'os';
import path from 'path';
import log from 'npmlog';
import { highlight, formatNumber, isCudaAvailable } from './utils';
import crypto from 'crypto';
import { AutoBuildFile, EnvSummery } from './types.js';
import { ALLARGS, ArgInfo, defaultEnabledModules, OpenCVBuildEnvParams, OpenCVBuildEnvParamsBool, OpenCVBuildEnvParamsString, OpencvModulesType, OpenCVPackageBuildOptions, OPENCV_PATHS_ENV } from './misc';
import { ALL_OPENCV_MODULES } from '.';

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

    private resolveValue(info: ArgInfo): string {
        if (info.conf in this.opts) {
            if (info.isBool) {
                return this.opts[info.conf] ? '1' : '';
            } else
                return this.opts[info.conf] as string || '';
        } else {
            if (this.#packageEnv && this.#packageEnv[info.conf]) {
                return this.#packageEnv[info.conf] || '';
            } else {
                return process.env[info.env] || '';
            }
        }
    }
    #packageEnv: OpenCVPackageBuildOptions = {};

    constructor(private opts = {} as OpenCVBuildEnvParams) {
        const DEFAULT_OPENCV_VERSION = '4.5.5';
        this.prebuild = opts.prebuild;
        this._platform = process.platform;
        this.packageRoot = opts.rootcwd || process.env.INIT_CWD || process.cwd();
        this.buildRoot = opts.buildRoot || process.env.OPENCV_BUILD_ROOT || path.join(__dirname, '..')
        if (this.buildRoot[0] === '~') {
            this.buildRoot = path.join(os.homedir(), this.buildRoot.slice(1));
        }
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
        this.no_autobuild = this.resolveValue(ALLARGS.nobuild);
        if (!this.no_autobuild && opts.prebuild) {
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
                throw Error(`failed to read build info from ${builds[0].autobuild}`);
            const flagStr = autoBuildFile.env.autoBuildFlags;
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
            return;
        }
        // try to build a new openCV or use a prebuilt one
        if (this.no_autobuild) {
            this.opencvVersion = '0.0.0';
        } else {
            this.opencvVersion = this.resolveValue(ALLARGS.version);
            if (!this.opencvVersion) {
                this.opencvVersion = DEFAULT_OPENCV_VERSION;
                log.info('init', `no openCV version given using default verison ${formatNumber(DEFAULT_OPENCV_VERSION)}`)
            } else {
                log.info('init', `using openCV verison ${formatNumber(this.opencvVersion)}`)
            }
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
        this.isWithoutContrib = !!this.resolveValue(ALLARGS.nocontrib);
        this.isAutoBuildDisabled = !!this.resolveValue(ALLARGS.nobuild);
        this.keepsources = !!this.resolveValue(ALLARGS.keepsources);
        this.dryRun = !!this.resolveValue(ALLARGS['dry-run']);
        this.gitCache = !!this.resolveValue(ALLARGS['git-cache']);
    }

    #ready = false;
    /**
     * complet initialisation.
     */
    private getReady(): void {
        if (this.#ready)
            return;
        this.#ready = true;
        for (const varname of ['binDir', 'incDir', 'libDir'] ) {
            const varname2 = varname as 'binDir' | 'incDir' | 'libDir';
            const value = this.resolveValue(ALLARGS[varname2]);
            if (value && process.env[varname] !== value) {
                process.env[ALLARGS[varname2].env] = value;
            }
        }
        if (this.no_autobuild) {
            for (const varname of OPENCV_PATHS_ENV) {
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

    /** default module build list */
    #enabledModules = new Set<OpencvModulesType>(defaultEnabledModules);
    
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
            let arg = `-DBUILD_opencv_${mod}=`;
            arg += this.#enabledModules.has(mod) ? 'ON' : 'OFF';
            out.push(arg);
        }
        return out;
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
            '-DBUILD_EXAMPLES=OFF', // do not build opencv_contrib samples
            '-DBUILD_DOCS=OFF',
            '-DBUILD_TESTS=OFF',
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
        if (this.buildWithCuda && isCudaAvailable()) {
            // log.info('install', 'Adding CUDA flags...');
            // this.enabledModules.delete('cudacodec');// video codec (NVCUVID) is deprecated in cuda 10, so don't add it
            cMakeflags.push('-DWITH_CUDA=ON', '-DCUDA_FAST_MATH=ON'/* optional */, '-DWITH_CUBLAS=ON' /* optional */)
        }
        cMakeflags.push(...this.getCmakeBuildFlags());
        // add user added flags
        if (this.autoBuildFlags && typeof (this.autoBuildFlags) === 'string' && this.autoBuildFlags.length) {
            // log.silly('install', 'using flags from OPENCV4NODEJS_AUTOBUILD_FLAGS:', this.autoBuildFlags)
            cMakeflags.push(...this.autoBuildFlags.split(' '));
        }
        return cMakeflags;
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

    private static getPackageJson(): string {
        return path.resolve(process.cwd(), 'package.json');
    }

    /**
     * extract opencv4nodejs section from package.json if available
     */
    private static parsePackageJson(): { file: string, data: {opencv4nodejs?: {[key: string]: string | boolean | number}}} | null {
        const absPath = OpenCVBuildEnv.getPackageJson();
        if (!fs.existsSync(absPath)) {
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
    public static readEnvsFromPackageJson(): { [key: string]: string | boolean | number } | null {
        const rootPackageJSON = OpenCVBuildEnv.parsePackageJson()
        if (!rootPackageJSON) {
            return null;
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
        let optArgs = this.getCongiguredCmakeFlags().join(' ');
        // if (this.autoBuildFlags) 
        //     optArgs += ' ' + this.autoBuildFlags;
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