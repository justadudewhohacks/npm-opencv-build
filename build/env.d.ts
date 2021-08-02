import { AutoBuildFile } from './types';
export declare function isAutoBuildDisabled(): boolean;
export declare function buildWithCuda(): boolean;
export declare function isWithoutContrib(): boolean;
export declare function autoBuildFlags(): string;
export declare function opencvVersion(): string;
export declare function numberOfCoresAvailable(): number;
export declare function parseAutoBuildFlags(): string[];
export declare function readAutoBuildFile(): AutoBuildFile | undefined;
export declare function getCwd(): string;
/**
 * get opencv4nodejs section from package.json if available
 * @returns opencv4nodejs customs
 */
export declare function readEnvsFromPackageJson(): {
    [key: string]: string | boolean | number;
};
export declare function applyEnvsFromPackageJson(): void;
