<script setup lang="ts">
</script>

<template>
  <div class="container">
    <h1>{{PROJECT_NAME}}</h1>
    <p>Your Unlayer email editor is ready!</p>
    <router-link to="/editor" class="btn">
      Open Email Editor
    </router-link>
    <div class="links">
      <a href="https://docs.unlayer.com" target="_blank" rel="noopener noreferrer">
        Documentation
      </a>
      <a href="https://examples.unlayer.com" target="_blank" rel="noopener noreferrer">
        Examples
      </a>
    </div>
  </div>
</template>
