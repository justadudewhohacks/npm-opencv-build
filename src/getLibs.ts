import fs from 'fs';
import path from 'path';
import { getLibsFactory } from './getLibsFactory';
import { isOSX, isWin } from './utils.js';
import { opencvModules } from './constants.js';

export const getLibs = getLibsFactory({ isWin, isOSX, opencvModules, path, fs })

