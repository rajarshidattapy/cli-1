<script setup lang="ts">
import { ref } from 'vue';
import { EmailEditor } from 'vue-email-editor';

const emailEditorRef = ref<any>(null);

const editorLoaded = () => {
  // Load sample design
  fetch('/designs/sample.json')
    .then((res) => res.json())
    .then((design) => {
      emailEditorRef.value?.editor?.loadDesign(design);
    })
    .catch(() => {
      console.log('No sample design found');
    });
};

const saveDesign = () => {
  emailEditorRef.value?.editor?.saveDesign((design: any) => {
    const json = JSON.stringify(design, null, 2);
    downloadFile('design.json', json, 'application/json');
  });
};

const exportHtml = () => {
  emailEditorRef.value?.editor?.exportHtml((data: any) => {
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
        emailEditorRef.value?.editor?.loadDesign(designData);
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
</script>

<template>
  <div class="editor-page">
    <div class="toolbar">
      <span class="toolbar-title">Unlayer Email Editor</span>
      <button class="btn-secondary" @click="loadDesign">
        Load
      </button>
      <button class="btn-primary" @click="saveDesign">
        Save Design
      </button>
      <button class="btn-success" @click="exportHtml">
        Export HTML
      </button>
    </div>
    <div class="editor-container">
      <EmailEditor
        ref="emailEditorRef"
        @load="editorLoaded"
        :project-id="{{PROJECT_ID}}"
        :appearance="{ theme: 'modern_light' }"
      />
    </div>
  </div>
</template>
