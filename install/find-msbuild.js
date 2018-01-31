const path = require('path')
const fs = require('fs')
const { exec, execFile } = require('./utils')

/* this codesnippet is partly taken from the node-gyp source: https://github.com/nodejs/node-gyp */
function findVs2017() {
  const ps = path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  const args = ['-ExecutionPolicy', 'Unrestricted', '-Command',
                '&{Add-Type -Path \'' + path.join(__dirname, 'Find-VS2017.cs') +
                '\'; [VisualStudioConfiguration.Main]::Query()}']

  console.log('find vs2017 via powershell:', ps, args)

  return execFile(ps, args, { encoding: 'utf8' })
    .then((stdout) => {
      console.log('find vs2017: ', stdout)
      const vsSetup = JSON.parse(stdout)
      if (!vsSetup || !vsSetup.path || !vsSetup.sdk) {
        return Promise.reject('unexpected powershell output')
      }
      console.log('found vs2017')
      console.log('path', vsSetup.path)
      console.log('sdk', vsSetup.sdk)

      return path.join(vsSetup.path, 'MSBuild', '15.0', 'Bin', 'MSBuild.exe')
    })
}

function parseMsBuilds(stdout) {
  let reVers = /ToolsVersions\\([^\\]+)$/i
  , rePath = /\r\n[ \t]+MSBuildToolsPath[ \t]+REG_SZ[ \t]+([^\r]+)/i
  , msbuilds = []
  , r

  stdout.split('\r\n\r\n').forEach(function(l) {
    if (!l) return
    l = l.trim()
    if (r = reVers.exec(l.substring(0, l.indexOf('\r\n')))) {
      var ver = parseFloat(r[1], 10)
      if (ver >= 3.5) {
        if (r = rePath.exec(l)) {
          msbuilds.push({
            version: ver,
            path: r[1]
          })
        }
      }
    }
  })

  return msbuilds
}

function findMsbuildInRegistry () {
  const cmd = `reg query "HKLM\\Software\\Microsoft\\MSBuild\\ToolsVersions" /s${process.arch === 'ia32' ? '' : ' /reg:32'}`
  console.log('find msbuild in registry:', cmd)

  return exec(cmd)
    .then((stdout) => {
      console.log('find vs2017: ', stdout)

      // use most recent version
      const msbuilds = parseMsBuilds(stdout)
        .sort((m1, m2) => m2.version - m1.version)
        .map(msbuild => Object.assign({}, msbuild, { path: path.resolve(msbuild.path, 'msbuild.exe') }))

      if (!msbuilds.length) {
        return Promise.reject('failed to find msbuild in registry')
      }

      console.log('trying the following msbuild paths:')
      msbuilds.forEach((msbuild) => {
        console.log('version: %s, path: %s', msbuild.version, msbuild.path)
      })
      
      const build = msbuilds.find((msbuild) => {      
        try {
          return fs.statSync(msbuild.path)
        } catch(err){
          if (err.code == 'ENOENT') {
            return false
          }
          throw err
        }
      })

      if (!build) {
        return Promise.reject('could not find msbuild.exe from path in registry')
      }

      console.log('using following msbuild:')
      console.log('version:', build.version)
      console.log('path:', build.path)
      return Promise.resolve(build)
    })
  }

module.exports = function() {
  return findVs2017().catch((err) => {
    console.log('failed to find vs2017 via powershell:', err)
    return findMsbuildInRegistry()
  })
}