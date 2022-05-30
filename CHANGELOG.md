# Changelog

* V 0.5.3
- fix prebuild openCV usage.

* V 0.5.2
- fix regression in agument parsing bis

* V 0.5.1
- fix regression in agument parsing
- fix cuda detection code

* V 0.5.0
 - fix -h alias from --help
 - remove build log at runtime.
 - re-write cmake parameter handle
 - disable buy default some opencv modules
 - add -DBUILD_ZLIB=OFF by default, fix MacOs X build error
 - default openCV version build is now 4.5.5
 - OpenCVBuilder.env can be modifyed immediately after his instanciation to enable/disable openCV modules.
 - add --git-cache or OPENCV_GIT_CACHE env variabe cache git data on local disk

* V 0.4.7
 - add --dry-run parameter to debug openCV build failure.
 - do not build module wechat_qrcode
 - improve output text readability

* V 0.4.6
 - add static methods in OpenCVBuildEnv.

* V 0.4.5
 - fix OPENCV4NODEJS_DISABLE_AUTOBUILD

* V 0.4.4
 - fix disable autobuid

* V 0.4.3
 - allow usage of all Microsoft buildtools editions. [issue 7](https://github.com/UrielCh/opencv4nodejs/issues/7)
 - dump dependencies versions

* V 0.4.2
 - Change Typescript build target to ES2017 so it works with electron

* V 0.4.1
 - drop old findVs2017 script
 - fix findMSBuild (was locked to vs 2019)
 - add WARNING if multiple MSBuild are available

* V 0.4.0
 - Main release