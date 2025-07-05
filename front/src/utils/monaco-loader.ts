import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

// Fix for Monaco Editor initialization in Next.js
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.MonacoEnvironment = {
    getWorkerUrl: function (_moduleId: string, label: string) {
      if (label === 'json') {
        return '/_next/static/chunks/json.worker.js';
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return '/_next/static/chunks/css.worker.js';
      }
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return '/_next/static/chunks/html.worker.js';
      }
      if (label === 'typescript' || label === 'javascript') {
        return '/_next/static/chunks/ts.worker.js';
      }
      return '/_next/static/chunks/editor.worker.js';
    }
  };
}

export default monaco;