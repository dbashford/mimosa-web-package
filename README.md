mimosa-web-package
===========

This is a Mimosa web packaging module. It assumes that the mimosa-server module is also being used.

* For more information regarding Mimosa, see http://mimosajs.com
* For information regarding packaging in Mimosa, see http://mimosajs.com/commands.html#package

## Usage

Add `web-package` as a string to your list of `modules` in the `mimosa-config`.  When Mimosa starts up, it will install the module for you.

## Functionality

If the `isPackage` flag is set (if you are running `mimosa build` with the `--package` flag), mimosa-web-package attaches itself to Mimosa's `buildDone' workflow as part of the `package` step.

At that step mimosa-web-package will:

* Remove the directory at `webPackage.outPath` if it already exists
* Copy your entire project to the `webPackage.outPath` folder, omitting anything you have listed in `webPackage.exclude`
* Write the parts of the fully-resolved and blown out `mimosa-config` that pertain to the server to the `webPackage.outPath` as `config.json`.  Will set some config values, like live reload to production level settings.  Will also turn normally absolute `mimosa-config` paths relative.
* Write a simple `app.js` file to `webPackage.outPath`.  `app.js` exists to be a starting point for your app when Mimosa is not available to invoke your server.  It simply reads the config, and calls your server.startServer method passing the config.
* runs NPM install from inside the `webpackage.outPath`
* gzips the entire folder as a sep .gz file

What you get as a result is an application that runs without Mimosa's aid by simply executing `node app.js`, as well as an archive file (.tar.gz) of the codebase.

## Default Config

```
webPackage:
  outPath: "dist"
  exclude: ["README.md","node_modules","mimosa-config.coffee","mimosa-config.js"]
```

* `outPath`: a string, the location, relative to the root of your application, where mimosa-web-package will place your packaged app
* `exclude`: an array, files, relative to the root of the application, to not include in the package.  If it isn't listed in this array, it will be included in the package.
