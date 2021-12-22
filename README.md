[![Build Status](https://travis-ci.org/justadudewhohacks/npm-opencv-build.svg?branch=master)](http://travis-ci.org/justadudewhohacks/npm-opencv-build)
[![Build status](https://ci.appveyor.com/api/projects/status/uv8n2sruno95rxtq/branch/master?svg=true)](https://ci.appveyor.com/project/justadudewhohacks/npm-opencv-build/branch/master)

A simple script to auto build recent OpenCV + contrib version via npm. This script is used to auto build [*opencv4nodejs*](https://github.com/UrielCh/opencv4nodejs).

# Install

``` bash
npm install opencv-build
```

## Requirements

- cmake

### Windows

- windows build tools or Visual Studio: run in a adminstrator powershell:

``` bash
npm install --global windows-build-tools
setx OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION 4.5.4
```

## Environment Variables

It's possible to specify build environment variables by inserting them into the `package.json` where the dependency is declared an object like:

```json
{
  "opencv4nodejs": {
    "autoBuildFlags": "-DOPENCV_GENERATE_PKGCONFIG=ON -DOPENCV_PC_FILE_NAME=opencv.pc",
    "autoBuildOpencvVersion": "4.1.0"
  }
}
```

The following environment variables can be passed:

- autoBuildBuildCuda
- autoBuildFlags
- autoBuildOpencvVersion
- autoBuildWithoutContrib
- disableAutoBuild
- opencvIncludeDir
- opencvLibDir
- opencvBinDir

## build test

```bash
OPENCV4NODEJS_AUTOBUILD_FLAGS=-DBUILD_LIST=core,imgproc,imgcodecs,videoio,highgui,video,calib3d,features2d,objdetect,dnn,ml,flann,photo,stitching,gapi
npm run build && OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION=3.4.15 OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB=1 npm run do-install
```

```bash
npm run build && OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION=4.5.4 OPENCV4NODEJS_AUTOBUILD_WITHOUT_CONTRIB=1 npm run do-install
```
