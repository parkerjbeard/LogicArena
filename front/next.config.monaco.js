const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: ['javascript', 'typescript', 'json'],
          features: [
            'bracketMatching',
            'clipboard',
            'coreCommands',
            'cursorUndo',
            'find',
            'folding',
            'fontZoom',
            'format',
            'inlineCompletions',
            'links',
            'multicursor',
            'parameterHints',
            'quickCommand',
            'quickOutline',
            'referenceSearch',
            'rename',
            'smartSelect',
            'snippets',
            'suggest',
            'toggleHighContrast',
            'toggleTabFocusMode',
            'transpose',
            'wordHighlighter',
            'wordOperations',
            'wordPartOperations',
          ],
        })
      );
    }
    return config;
  },
};