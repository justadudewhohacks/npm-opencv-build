"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLibsFactory = void 0;
const worldModule = 'world';
function getLibsFactory(args) {
    const { opencvModules, isWin, isOSX, fs, path } = args;
    function getLibPrefix() {
        return isWin() ? 'opencv_' : 'libopencv_';
    }
    /**
     * @returns lib extention based on current OS
     */
    function getLibSuffix() {
        if (isWin())
            return 'lib';
        if (isOSX())
            return 'dylib';
        return 'so';
    }
    /**
     * build a regexp matching os lib file
     * @param opencvModuleName
     * @returns
     */
    function getLibNameRegex(opencvModuleName) {
        // const regexp = `^${getLibPrefix()}${opencvModuleName}[0-9]{0,3}.${getLibSuffix()}$`;
        const regexp = `^${getLibPrefix()}${opencvModuleName}[0-9.]*\.${getLibSuffix()}$`;
        return new RegExp(regexp);
    }
    function createLibResolver(libDir) {
        function getLibAbsPath(libFile) {
            if (!libFile)
                return undefined;
            return fs.realpathSync(path.resolve(libDir, libFile));
        }
        function matchLibName(libFile, regexp) {
            return !!(libFile.match(regexp) || [])[0];
        }
        const libFiles = fs.readdirSync(libDir);
        return function (opencvModuleName) {
            const regexp = getLibNameRegex(opencvModuleName);
            const matchs = libFiles.find(libFile => matchLibName(libFile, regexp));
            return getLibAbsPath(matchs);
        };
    }
    return function (libDir) {
        if (!fs.existsSync(libDir)) {
            throw new Error(`specified lib dir does not exist: ${libDir}`);
        }
        const resolveLib = createLibResolver(libDir);
        const worldLibPath = resolveLib(worldModule);
        if (worldLibPath) {
            return [{
                    opencvModule: worldModule,
                    libPath: worldLibPath
                }];
        }
        return opencvModules.map((opencvModule) => ({
            opencvModule,
            libPath: resolveLib(opencvModule)
        }));
    };
}
exports.getLibsFactory = getLibsFactory;
