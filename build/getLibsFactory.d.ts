/// <reference types="node" />
import { EncodingOption, PathLike } from 'fs';
import { OpencvModule } from './types';
interface tsType {
    realpathSync(path: PathLike, options?: EncodingOption): string;
    readdirSync(path: PathLike): string[];
    existsSync(path: PathLike): boolean;
}
interface tsPath {
    resolve(...pathSegments: string[]): string;
}
export declare function getLibsFactory(args: {
    opencvModules: string[];
    isWin: () => boolean;
    isOSX: () => boolean;
    fs: tsType;
    path: tsPath;
}): (libDir: string) => OpencvModule[];
export {};
