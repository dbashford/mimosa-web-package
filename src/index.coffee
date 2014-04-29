'use strict'

path = require 'path'
fs = require 'fs'
{exec} = require 'child_process'

rimraf = require 'rimraf'
_ = require 'lodash'
hogan = require 'hogan.js'

moduleConfig = require './config'

logger = null
isReallyWindows = true
langs =
  coffee:"coffee-script"
  js:false
  ls:"LiveScript"
  iced:"iced-coffee-script"

registration = (config, register) ->
  if config.isPackage
    logger = config.log

    register ['postBuild'], 'package',  _package

    if process.platform is "win32"
      exec 'uname', (error, stdout, stderr) =>
        if not error then isReallyWindows = false

_package = (config, options, next) ->
  logger.info "Beginning web-package"

  # delete directory if it exists
  if fs.existsSync config.webPackage.outPath
    logger.debug "Deleting #{config.webPackage.outPath} ]]"
    rimraf.sync config.webPackage.outPath

  # copy over all assets
  logger.debug "Copying [[ #{config.root} ]] to [[ #{config.webPackage.outPath} ]]"
  copyDirSyncRecursive config.root, config.webPackage.outPath, config.webPackage.exclude

  # write config to output after modifying the config
  __writeConfig(config)

  if config.server?.defaultServer?.enabled is true
    logger.info "Default server being used, not writing app.js or running npm install"
    logger.info "Completed web-package"
    next()
  else
    # write app.js to output, run npm inside target directory
    if config.webPackage.appjs
      __writeApplicationStarter config
    __runNPMInstall config, next

__runNPMInstall = (config, next) ->
  # run npm in dist folder to generate node modules pre-package
  currentDir = process.cwd()
  process.chdir config.webPackage.outPath
  logger.debug "Running NPM inside [[ #{config.webPackage.outPath} ]]"
  exec "npm install --production", (err, sout, serr) =>
    logger.debug "NPM INSTALL standard out\n#{sout}"
    logger.debug "NPM INSTALL standard err\n#{serr}"

    done = ->
      process.chdir currentDir
      logger.info "Completed web-package"
      next()

    if err
      logger.error "Error running NPM Install: #{err}"
      done()
    else
      logger.debug "Zip contents of [[ #{config.webPackage.outPath} ]]"
      tarballName = config.webPackage.archiveName
      # if didn't change default, look for package.json name
      if tarballName is moduleConfig.defaults().webPackage.archiveName
        try
          pack = require(path.join config.root, 'package.json')
          tarballName = pack.name if pack.name?
        catch err
          logger.debug "No package.json"

      tarballName = "#{tarballName}.tar.gz"
      outputTarFile = path.join config.root, tarballName
      tarCommand = "tar -czf #{outputTarFile} ."

      if process.platform is "win32" and not isReallyWindows
        # Probably running in Git Bash. Paths must be /c/path/to/file instead of c:\path\to\file.
        altOutputTarFile = outputTarFile.replace(/(.+):/, "/$1")
        altOutputTarFile = require('slash')(altOutputTarFile)
        tarCommand = "tar -czf #{altOutputTarFile} ."

      logger.debug "tar command: #{tarCommand}"
      exec tarCommand, (err, sout, serr) =>
        if err
          logger.info "Failed to 'tar' file using command [[ #{tarCommand} ]]"
        else
          fs.renameSync outputTarFile, path.join config.webPackage.outPath, tarballName

        done()

__writeConfig = (config) ->
  configClone = _.clone(config, true)

  if config.webPackage.useEntireConfig
    writeConfig = configClone
    if writeConfig.liveReload
      writeConfig.liveReload.enabled = false
    ["extensions", "installedModules", "logger", "timer", "helpers", "log"].forEach (prop) ->
      delete writeConfig[prop] if writeConfig[prop]

  else
    writeConfig =
      watch: configClone.watch
      liveReload:
        enabled:false
      isOptimize: configClone.isOptimize

  if configClone.server
    writeConfig.server = configClone.server
    if writeConfig.server.path
      writeConfig.server.path = path.relative(config.root, writeConfig.server.path).split(path.sep)
    if writeConfig.server.views?.path
      writeConfig.server.views.path = path.relative(config.root, writeConfig.server.views.path).split(path.sep)

  writeConfig.watch.sourceDir = path.relative(config.root, writeConfig.watch.sourceDir).split(path.sep)
  writeConfig.watch.compiledDir = path.relative(config.root, writeConfig.watch.compiledDir).split(path.sep)
  writeConfig.watch.javascriptDir = path.relative(config.root, writeConfig.watch.javascriptDir).split(path.sep)
  writeConfig.watch.compiledJavascriptDir = path.relative(config.root, writeConfig.watch.compiledJavascriptDir).split(path.sep)
  configOutPath = path.join config.webPackage.outPath, "#{config.webPackage.configName}.js"
  logger.debug "Writing mimosa-config to [[ #{configOutPath} ]]"
  configText = __generateConfigText(writeConfig)
  fs.writeFileSync configOutPath, configText, 'ascii'

__generateConfigText = (configText) ->
  hoganTemplateText = fs.readFileSync path.join(__dirname, 'resources', 'config-template.hogan'), 'ascii'
  compiledHogan = hogan.compile(hoganTemplateText)
  context =
    configJSON: JSON.stringify(configText, null, 2)
  compiledHogan.render(context).replace(/&quot;/g,"\"")

__writeApplicationStarter = (config) ->
  appJsInPath = path.join __dirname, 'resources', 'app.js'
  appJsText = fs.readFileSync appJsInPath, 'ascii'
  if config.server?.path?
    serverExtension = path.extname(config.server.path).substring(1)
  prependLang = if serverExtension? and langs[serverExtension]?
    if langs[serverExtension]
      logger.debug "Adding require statement to app.js"
      langs[serverExtension]
  else
    try
      pack = require(path.join config.root, 'package.json')
      logger.debug "Looking through package to determine proper language to require in at top of app.js"
      chosenLang = null
      for ext, lang of langs
        if pack.dependencies[lang]?
          chosenLang = lang
          break
      chosenLang
    catch err
      logger.info "Unable to determine language of server file, you might need to address the app.js file to add a require statement for your language of choice"

  if prependLang?
    coffeeMatch = /.*?coffee-script/.test prependLang
    if coffeeMatch
      prepend = "require('#{prependLang}/register')\n";
    else
      prepend = "require('#{prependLang}')\n";
    appJsText = prepend + appJsText

  rootPathFromAppjs = ''
  serverRelPath = config.server.path.split(config.root)[1].substr(1)

  if path.dirname(config.webPackage.appjs) isnt '.'
    for level in path.dirname(config.webPackage.appjs).split(path.sep)
      do ->
        rootPathFromAppjs += '..' + path.sep

  if rootPathFromAppjs == ''
    appJsText = appJsText.replace "CONFIG_PATH", "./#{config.webPackage.configName}"
    appJsText = appJsText.replace "SERVER_PATH", "./#{serverRelPath}"
  else
    appJsText = appJsText.replace "CONFIG_PATH", path.join(rootPathFromAppjs, config.webPackage.configName)
    appJsText = appJsText.replace "SERVER_PATH", path.join(rootPathFromAppjs, serverRelPath)

  appJsOutPath = path.join config.webPackage.outPath, config.webPackage.appjs
  logger.debug "Writing app.js to [[ #{appJsOutPath} ]]"
  fs.writeFileSync appJsOutPath, appJsText, 'ascii'

copyDirSyncRecursive = (sourceDir, newDirLocation, excludes) ->
  checkDir = fs.statSync(sourceDir);
  fs.mkdirSync(newDirLocation, checkDir.mode);
  files = fs.readdirSync(sourceDir);

  files.forEach (f) ->
    filePath = path.join sourceDir, f
    return if excludes.indexOf(filePath) >= 0

    newFilePath = path.join newDirLocation, f
    currFile = fs.lstatSync filePath
    if currFile.isDirectory()
      copyDirSyncRecursive filePath, newFilePath, excludes
    else if currFile.isSymbolicLink()
      symlinkFull = fs.readlinkSync filePath
      fs.symlinkSync symlinkFull, newFilePath
    else
      contents = fs.readFileSync filePath
      if f is "package.json"
        try
          packageJson = require filePath
          _.keys(packageJson.dependencies).forEach (key) ->
            if key.indexOf('mimosa-') is 0
              delete packageJson.dependencies[key]
          contents = JSON.stringify packageJson, null, 2
        catch err
          logger.error "Error parsing package.json: #{err}"

      fs.writeFileSync newFilePath, contents

module.exports =
  registration: registration
  defaults:     moduleConfig.defaults
  placeholder:  moduleConfig.placeholder
  validate:     moduleConfig.validate
