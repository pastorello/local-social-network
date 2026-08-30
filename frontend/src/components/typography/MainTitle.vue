<template>
  <!-- The page's single h1 (ADR-0005). Its size, tracking and weight are the
  `display` step of the type scale (spec/design.md D6) rather than a Tailwind
  size picked per view: with one sans family and no display serif, the scale
  is what carries the register. -->
  <h1 class="mb-6 font-display text-display"><slot></slot></h1>
</template>
