import { OpenCVBuilder } from "./OpenCVBuilder.js"


export class Constant {
  constructor(private readonly builder: OpenCVBuilder) {
  }

  opencvRepoUrl = 'https://github.com/opencv/opencv.git'
  // opencvRepoUrl = 'c:/cache/opencv'

  opencvContribRepoUrl = 'https://github.com/opencv/opencv_contrib.git'
  // opencvContribRepoUrl = 'c:/cache/opencv_contrib'

//   opencvModules = opencvModules;

  cmakeVsCompilers: { [version: string]: string } = {
    '10': 'Visual Studio 10 2010',
    '11': 'Visual Studio 11 2012',
    '12': 'Visual Studio 12 2013',
    '14': 'Visual Studio 14 2015',
    '15': 'Visual Studio 15 2017',
    '16': 'Visual Studio 16 2019',
    '17': 'Visual Studio 17 2022',
  }
  cmakeArchs: { [arch: string]: string } = { 'x64': ' Win64', 'ia32': '', 'arm': ' ARM' }
}
