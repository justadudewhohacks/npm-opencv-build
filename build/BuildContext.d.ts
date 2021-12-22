import { AutoBuildFile } from './types';
export declare class BuildContext {
    opencvVersion: string;
    constructor();
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
    readAutoBuildFile(): AutoBuildFile | undefined;
}
export default BuildContext;
