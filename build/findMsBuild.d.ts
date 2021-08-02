export interface pathVersion {
    version: number;
    path: string;
}
export declare function findMsBuild(): Promise<pathVersion>;
