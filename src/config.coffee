"use strict"

path = require 'path'

exports.defaults = ->
  webPackage:
    archiveName: "app"
    outPath: "dist"
    configName: "config"
    useEntireConfig: false
    exclude: ["README.md","node_modules","mimosa-config.coffee","mimosa-config.js","assets",".git",".gitignore",".travis.yml"]
    appjs:"app.js"

exports.placeholder = ->
  """
  \t

    ###
    The webPackage module works hand in hand with the mimosa-server module to package web
    applications
    ###
    webPackage:                 # Configration for packaging of web applications
      archiveName: "app"        # If the default is changed away from `app`, the changed config
                                # setting will be used.  If the default is left alone,
                                # web-package will check the for a `name` property in the
                                # package.json, and if it exists, it will be used.   If the
                                # default is left as `app`, and there is no package.json.name
                                # property, the default is used.
      outPath:"dist"            # Output path for assets to package, should be relative to the
                                # root of the project (location of mimosa-config) or be absolute
      configName:"config"       # the name of the config file, will be placed in outPath and have
                                # a .json extension. it is also acceptable to define a subdirectory
      useEntireConfig: false    # this module pulls out specific pieces of the mimosa-config that
                                # apply to  what you may need with a packaged application. For
                                # instance, it does not include a coffeescript config, or a jshint
                                # config. If you want it to include the entire resolved mimosa-config
                                # flip this flag to true.
      ###
      Exclude is a list of files/folders relative to the root of the app to not copy to the outPath
      as part of a package.  By default the watch.sourceDir is added to this list during processing.
      ###
      exclude:["README.md","node_modules","mimosa-config.coffee","mimosa-config.js","assets",".git",".gitignore",".travis.yml"]
      appjs: "app.js"           # name of the output app.js file which bootstraps the application,
                                # when set to null, web-package will not output a bootstrap file

  """

exports.validate = (config, validators) ->
  errors = []
  if validators.ifExistsIsObject(errors, "webPackage config", config.webPackage)

    if config.webPackage.outPath?
      if typeof config.webPackage.outPath is "string"
        config.webPackage.outPath = validators.determinePath config.webPackage.outPath, config.root
      else
        errors.push "webPackage.outPath must be a string."

    validators.ifExistsIsString(errors, "webPackage.configName", config.webPackage.configName)
    validators.ifExistsIsString(errors, "webPackage.archiveName", config.webPackage.archiveName)
    validators.ifExistsIsBoolean(errors, "webPackage.useEntireConfig", config.webPackage.useEntireConfig)

    if validators.ifExistsIsArray(errors, "webPackage.exclude", config.webPackage.exclude)
      fullPathExcludes = []
      for ex in config.webPackage.exclude
        if typeof ex is "string"
          fullPathExcludes.push path.join config.root, ex
        else
          errors.push "webPackage.exclude must be an array of strings"
          break
      config.webPackage.exclude = fullPathExcludes
      config.webPackage.exclude.push config.webPackage.outPath

    validators.ifExistsIsString(errors, "webPackage.appjs", config.webPackage.appjs)

    if config.server? or config.server.path?
      config.webPackage.appjs = undefined

  errors
