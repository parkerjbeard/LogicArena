'use client';

import React, { useEffect, useState } from 'react';
import Editor, { loader } from '@monaco-editor/react';

// Configure Monaco loader
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
  }
});

interface MonacoEditorWrapperProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  theme?: string;
  onMount?: (editor: any, monaco: any) => void;
  options?: any;
  height?: string;
}

const MonacoEditorWrapper: React.FC<MonacoEditorWrapperProps> = ({
  value,
  onChange,
  language = 'javascript',
  theme = 'vs-dark',
  onMount,
  options = {},
  height = '400px',
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="h-full flex items-center justify-center">Loading editor...</div>;
  }

  return (
    <Editor
      height={height}
      language={language}
      theme={theme}
      value={value}
      onChange={onChange}
      onMount={onMount}
      options={{
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        ...options,
      }}
    />
  );
};

export default MonacoEditorWrapper;