import esbuild from 'esbuild';
import process from 'process';
import builtins from 'builtin-modules';
import importGlobPlugin from 'esbuild-plugin-import-glob';
import {replace} from 'esbuild-plugin-replace';

const banner =
`/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`;

const dummyMocksForDocs = `
document = {
  createElement: function() {},
};
`;

const prod = (process.argv[2] === 'production');

const mockedBanner = banner + dummyMocksForDocs;
const mockedPlugins = [replace({
  values: {
    // update usage of moment from obsidian to the node implementation of moment we have
    'import {moment} from \'obsidian\';': 'import moment from \'moment\';',
    // remove the use of obsidian in the options to allow for docs.js to run
    'import {App, Setting, ToggleComponent} from \'obsidian\';': '',
    // remove the use of obsidian in settings helper to allow for docs.js to run
    'import {App, MarkdownRenderer} from \'obsidian\';': '',
    // remove the use of obsidian in the auto-correct files picker to allow for docs.js to run
    'import {Setting, App, TFile, normalizePath, ExtraButtonComponent} from \'obsidian\';': '',
    // remove the use of obsidian in add custom row to allow for docs.js to run
    'import {App, Setting} from \'obsidian\';': '',
    // remove the use of obsidian in suggest to allow for docs.js to run
    'import {App, ISuggestOwner, Scope} from \'obsidian\';': '',
    // remove the use of obsidian in md file suggester to allow for docs.js to run
    'import {App, TFile} from \'obsidian\';': '',
    // remove the use of obsidian in parse results modal to allow for docs.js to run
    'import {Modal, App} from \'obsidian\';': 'class Modal {}',
    // remove the use of app from a couple of settings for docs.js to run
    'import {App} from \'obsidian\';': '',
  },
  delimiters: ['', ''],
})];
const unusedCodeForProduction = [replace({
  values: {
    // remove values for examples as they are not necessary in the actual plugin when it goes out to users
    'abstract get exampleBuilders(): ExampleBuilder<TOptions>[];': '',
    // removes eslint disabling that was just meant for examples
    '/* eslint-disable no-tabs */': '',
    '/* eslint-disable no-mixed-spaces-and-tabs, no-tabs */': '',
    // remove eslint enabling that was just meant for examples
    '/* eslint-enable no-tabs */': '',
    '/* eslint-enable no-mixed-spaces-and-tabs, no-tabs */': '',
    // add the multiline comment to remove the examples
    'get exampleBuilders():': '/*',
    // add the ending of the multiline comment that will remove the examples
    '}\n  get optionBuilders()': '*/ get optionBuilders()',
    // removes the logic that adds the examples to the rule
    'builder.exampleBuilders.map((b) => b.example),': '',
    // removes the expectation that examples will exist on the rule class
    'public examples: Array<Example>,': '',
  },
  delimiters: ['', ''],
})];

const createEsbuildArgs = function(banner, entryPoint, outfile, extraPlugins) {
  return {
    banner: {
      js: banner,
    },
    entryPoints: [entryPoint],
    plugins: [
      importGlobPlugin.default(),
      ...extraPlugins,
    ],
    bundle: true,
    external: [
      'obsidian',
      ...builtins],
    format: 'cjs',
    target: 'es2020',
    sourcemap: prod ? false : 'inline',
    minify: prod,
    treeShaking: true,
    outfile: outfile,
  };
};

const esbuildArgs = [
  createEsbuildArgs(banner, 'src/main.ts', 'main.js', unusedCodeForProduction),
  createEsbuildArgs(mockedBanner, 'src/docs.ts', 'docs.js', mockedPlugins),
  createEsbuildArgs(mockedBanner, 'src/translation-helper.ts', 'translation-helper.js', mockedPlugins),
  createEsbuildArgs(banner, '__integration__/main.test.ts', 'test-vault/.obsidian/plugins/obsidian-linter/main.js', []),
];

for (let i = 0; i < esbuildArgs.length; i++) {
  if (prod) {
    esbuild.build(
        esbuildArgs[i],
    ).catch(() => process.exit(1));
  } else {
    const context = await esbuild.context(esbuildArgs[i]);
    await context.watch();
  }
}
