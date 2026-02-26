'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type EmailEditorType from 'react-email-editor';
import type { EditorRef } from 'react-email-editor';

// Dynamically import the editor to avoid SSR issues
const EmailEditor = dynamic(() => import('react-email-editor'), {
  ssr: false,
  loading: () => <div style={{ padding: '2rem', textAlign: 'center' }}>Loading editor...</div>,
});

export default function EditorPage() {
  const emailEditorRef = useRef<EditorRef>(null);
  const [ready, setReady] = useState(false);

  const onReady = (unlayer: any) => {
    setReady(true);
    // Load sample design
    fetch('/designs/sample.json')
      .then((res) => res.json())
      .then((design) => {
        unlayer.loadDesign(design);
      })
      .catch((err) => {
        console.log('No sample design found:', err);
      });
  };

  const saveDesign = () => {
    const unlayer = emailEditorRef.current?.editor;
    unlayer?.saveDesign((design: any) => {
      const json = JSON.stringify(design, null, 2);
      downloadFile('design.json', json, 'application/json');
    });
  };

  const exportHtml = () => {
    const unlayer = emailEditorRef.current?.editor;
    unlayer?.exportHtml((data: any) => {
      downloadFile('email.html', data.html, 'text/html');
    });
  };

  const loadDesign = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const design = JSON.parse(event.target?.result as string);
          const designData = design.design || design;
          const unlayer = emailEditorRef.current?.editor;
          unlayer?.loadDesign(designData);
        } catch (err) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="editor-page">
      <div className="toolbar">
        <span className="toolbar-title">Unlayer Email Editor</span>
        <button className="btn-secondary" onClick={loadDesign} disabled={!ready}>
          Load
        </button>
        <button className="btn-primary" onClick={saveDesign} disabled={!ready}>
          Save Design
        </button>
        <button className="btn-success" onClick={exportHtml} disabled={!ready}>
          Export HTML
        </button>
      </div>
      <div className="editor-container">
        <EmailEditor
          ref={emailEditorRef}
          onReady={onReady}
          minHeight="100%"
          style={{ height: '100%' }}
          options={{
            projectId: {{PROJECT_ID}}, // Replace with your project ID
            appearance: {
              theme: 'modern_light',
            },
            features: {
              preview: true,
              imageEditor: true,
              undoRedo: true,
              stockImages: {
                enabled: true,
                safeSearch: true,
              },
            },
          }}
        />
      </div>
    </div>
  );
}
