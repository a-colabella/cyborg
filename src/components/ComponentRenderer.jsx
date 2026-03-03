import { useEffect, useRef, useState } from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Babel from '@babel/standalone';
import * as Recharts from 'recharts';

export default function ComponentRenderer({ code }) {
  const containerRef = useRef(null);
  const rootRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code || !containerRef.current) return;

    setError(null);

    try {
      // Step 1: Transpile JSX to JavaScript
      const transpiled = Babel.transform(code, {
        presets: ['react'],
        filename: 'component.jsx',
      }).code;

      // Step 2: Create an isolated execution context with React + Recharts in scope
      const moduleExports = {};
      const moduleFn = new Function(
        'React',
        'exports',
        'useState',
        'useEffect',
        'useRef',
        'useMemo',
        'useCallback',
        'useReducer',
        'useContext',
        'Fragment',
        'Recharts',
        `${transpiled}\n` +
          `if (typeof App !== 'undefined') exports.default = App;\n` +
          `if (typeof Component !== 'undefined' && !exports.default) exports.default = Component;\n`
      );

      moduleFn(
        React,
        moduleExports,
        React.useState,
        React.useEffect,
        React.useRef,
        React.useMemo,
        React.useCallback,
        React.useReducer,
        React.useContext,
        React.Fragment,
        Recharts
      );

      if (!moduleExports.default) {
        setError(
          'No component found. The code should define a function named App.'
        );
        return;
      }

      // Step 3: Render the component
      const Component = moduleExports.default;

      // Clean up previous React root
      if (rootRef.current) {
        rootRef.current.unmount();
      }

      rootRef.current = ReactDOM.createRoot(containerRef.current);
      rootRef.current.render(React.createElement(Component));
    } catch (err) {
      console.error('ComponentRenderer error:', err);
      setError(err.message);
    }

    return () => {
      if (rootRef.current) {
        rootRef.current.unmount();
        rootRef.current = null;
      }
    };
  }, [code]);

  return (
    <div className="relative w-full h-full">
      {error && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-red-900/50 border border-red-500 text-red-200 text-xs px-4 py-3 rounded-sm m-2">
          <div className="font-semibold mb-1">Render Error</div>
          <pre className="whitespace-pre-wrap font-mono">{error}</pre>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
