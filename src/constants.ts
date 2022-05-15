import { OpenCVBuilder } from "./OpenCVBuilder.js"

const opencvModules = [ 'apps', 'aruco', 'bgsegm', 'bioinspired', 'calib3d', 'ccalib',
'core', 'datasets', 'dnn', 'dnn_objdetect', 'dpm', 'features2d', 'flann', 'fuzzy',
'gapi', 'hfs', 'highgui', 'img_hash', 'imgcodecs', 'imgproc', 'java_bindings_generator',
'js', 'js_bindings_generator', 'line_descriptor', 'ml', 'objc_bindings_generator',
'objdetect', 'optflow', 'phase_unwrapping', 'photo', 'python3', 'python_bindings_generator',
'python_tests', 'reg', 'rgbd', 'saliency', 'shape', 'stereo', 'stitching', 'structured_light',
'superres', 'surface_matching', 'ts', 'video', 'videoio', 'wechat_qrcode', 'world',
'xobjdetect', 'xphoto'] as const;
export type OpencvModulesType = typeof opencvModules[number] | 'world';

export const enabledModules = new Set<OpencvModulesType>(
  [ 'calib3d', 'core', 'dnn', 'features2d', 'flann', 'gapi', 'highgui', 'imgcodecs', 'imgproc',
  'ml', 'objdetect', 'photo', 'python_tests', 'video', 'videoio']);

export class Constant {
  constructor(private readonly builder: OpenCVBuilder) {
  }

  opencvRepoUrl = 'https://github.com/opencv/opencv.git'
  // opencvRepoUrl = 'c:/cache/opencv'

  opencvContribRepoUrl = 'https://github.com/opencv/opencv_contrib.git'
  // opencvContribRepoUrl = 'c:/cache/opencv_contrib'

  opencvModules = opencvModules;

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

  defaultCmakeBuildFlags(): string[] {
    const out: string[] = [];
    for (const mod of opencvModules) {
      let arg =`-DBUILD_opencv_${mod}=`;
      arg += enabledModules.has(mod) ? 'ON' : 'OFF';
      out.push(arg);
    }
    return out;
  }

  public defaultCmakeFlags = () => {
    return [
      `-DCMAKE_INSTALL_PREFIX=${this.builder.env.opencvBuild}`,
      '-DCMAKE_BUILD_TYPE=Release',
      '-DBUILD_EXAMPLES=OFF', // do not build opencv_contrib samples
      '-DBUILD_DOCS=OFF',
      '-DBUILD_TESTS=OFF',
      '-DBUILD_PERF_TESTS=OFF',
      '-DBUILD_JAVA=OFF',
      '-DBUILD_ZLIB=OFF', // https://github.com/opencv/opencv/issues/21389
      '-DCUDA_NVCC_FLAGS=--expt-relaxed-constexpr',
      '-DWITH_VTK=OFF',
      ...this.defaultCmakeBuildFlags()
    ];
  }
  // if version < 4.5.6 ffmpeg 5 not compatible
  // https://stackoverflow.com/questions/71070080/building-opencv-from-source-in-mac-m1
  // brew install ffmpeg@4
  // brew unlink ffmpeg
  // brew link ffmpeg@4
}
