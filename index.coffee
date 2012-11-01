'use strict'

path = require 'path'
fs = require 'fs'
{exec} = require 'child_process'

rimraf = require 'rimraf'
logger = require 'logmimosa'
_ = require 'lodash'

config = require './config'

langs =
  coffee:"coffee-script"
  js:false
  ls:"LiveScript"
  iced:"iced-coffee-script"

registration = (config, register) ->
  if config.isPackage
    register ['buildDone'], 'package',  _package

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
  writeConfig(config)

  # write app.js to output, add language if need be
  determineLanguagePrepend(config)

  # run npm in dist folder to generate node modules pre-package
  currentDir = process.cwd()
  process.chdir config.webPackage.outPath
  logger.debug "Running NPM inside [[ #{config.webPackage.outPath} ]]"
  exec "npm install", (err, sout, serr) =>
    logger.debug "NPM INSTALL standard out\n#{sout}"
    logger.debug "NPM INSTALL standard err\n#{serr}"

    done = ->
      process.chdir currentDir
      logger.info "Completed web-package"
      next()

    if err
      logger.error err
      done()
    else
      logger.debug "Zip contents of [[ #{config.webPackage.outPath} ]]"
      outputTarFile = path.join config.root, 'app.tar.gz'
      tarCommand = "tar -czf #{outputTarFile} ."
      exec tarCommand, (err, sout, serr) =>
        if err
          logger.info "Failed to 'tar' file using command: #{tarCommand}"
        else
          fs.renameSync outputTarFile, path.join config.webPackage.outPath, 'app.tar.gz'

        done()

writeConfig = (config) ->
  configClone = _.clone(config, true)
  writeConfig =
    server: configClone.server
    watch: configClone.watch
    isOptimize: configClone.isOptimize
  writeConfig.server.path = writeConfig.server.path.replace config.root, '.'
  writeConfig.server.views.path = writeConfig.server.views.path.replace config.root, '.'
  writeConfig.watch.sourceDir = writeConfig.watch.sourceDir.replace config.root, '.'
  writeConfig.watch.compiledDir = writeConfig.watch.compiledDir.replace config.root, '.'
  writeConfig.watch.compiledJavascriptDir = writeConfig.watch.compiledJavascriptDir.replace config.root, '.'
  configOutPath = path.join config.webPackage.outPath, "#{config.webPackage.configName}.json"
  logger.debug "Writing mimosa-config to [[ #{configOutPath} ]]"
  fs.writeFileSync configOutPath, JSON.stringify(writeConfig, null, 2), 'ascii'

determineLanguagePrepend = (config) ->
  appJsInPath = path.join __dirname, 'lib', 'app.js'
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
    prepend = "require('#{prependLang}')\n";
    appJsText = prepend + appJsText

  appJsText = appJsText.replace "NAME", config.webPackage.configName

  appJsOutPath = path.join config.webPackage.outPath, 'app.js'
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
    currFile = fs.lstatSync(filePath);
    if currFile.isDirectory()
      copyDirSyncRecursive(filePath, newFilePath, excludes);
    else if currFile.isSymbolicLink()
      symlinkFull = fs.readlinkSync(filePath);
      fs.symlinkSync(symlinkFull, newFilePath);
    else
      contents = fs.readFileSync(filePath);
      fs.writeFileSync(newFilePath, contents);

module.exports =
  registration: registration
  defaults:     config.defaults
  placeholder:  config.placeholder
  validate:     config.validate