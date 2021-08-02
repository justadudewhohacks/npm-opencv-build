export declare class Dirs {
    get rootDir(): string;
    get opencvRoot(): string;
    get opencvSrc(): string;
    get opencvContribSrc(): string;
    get opencvContribModules(): string;
    get opencvBuild(): string;
    get opencvInclude(): string;
    get opencv4Include(): string;
    get opencvLibDir(): string;
    get opencvBinDir(): string;
    get autoBuildFile(): string;
}
declare const singleton: Dirs;
export default singleton;
