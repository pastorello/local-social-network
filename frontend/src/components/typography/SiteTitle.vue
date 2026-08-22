<template>
  <!-- Not an <h1>: this is persistent chrome on every route (AppHeader), not
  page content — each view's own MainTitle is the page's single h1 (ADR-0005;
  two h1s per page was confusing screen-reader heading navigation). -->
  <div>
    <RouterLink
      to="/"
      class="block text-xl font-bold text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-blue-500 animate-fade-in-up tracking-wider drop-shadow-lg hover:scale-105 transition-all duration-300"
    >
      <span class="relative inline-block text-2xl text-amber-700">V</span>ivere

      <span class="relative inline-block text-2xl text-amber-700 ml-2">G</span>aeta
    </RouterLink>
  </div>
</template>
