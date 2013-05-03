exports.config =
  modules: ["lint"]
  watch:
    sourceDir: "src"
    compiledDir: "lib"
    javascriptDir: null
  lint:
    rules:
      javascript:
        node: true
  compilers:
    extensionOverrides:
      hogan:null
  copy:
    extensions:["js","hogan"]