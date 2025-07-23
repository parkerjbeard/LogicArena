import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize globals immediately before any other scripts
              (function() {
                if (typeof window !== 'undefined') {
                  // Define globals in all possible contexts
                  window.globals = window.globals || window;
                  window.global = window.global || window;
                  globalThis.globals = globalThis.globals || globalThis;
                  globalThis.global = globalThis.global || globalThis;
                  
                  // Ensure process is available
                  if (!window.process) {
                    window.process = {
                      env: {},
                      platform: 'browser',
                      nextTick: function(fn) { setTimeout(fn, 0); },
                      versions: { node: '16.0.0' },
                      cwd: function() { return '/'; },
                      argv: [],
                      browser: true
                    };
                  }
                }
              })();
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}