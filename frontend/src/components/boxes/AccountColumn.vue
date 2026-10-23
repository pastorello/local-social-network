<script setup lang="ts">
import PanelBox from '@/components/boxes/PanelBox.vue'
</script>

<template>
  <!-- The one column every account page sits in (review PR-11, L-09;
  design.md "The account forms in one column"): a form's title, what the page
  is for, the fields, and the ways out under them; a profile's face, name and
  reports. They were two boxes side by side — the title on the left with
  hundreds of pixels of nothing under it, the form on the right; the profile
  was a quarter column too narrow for its own avatar. 420px holds an e-mail
  address and a password with room to spare; on a phone the box is as wide as
  the panel. -->
  <div class="mx-auto w-full max-w-[26.25rem]">
    <PanelBox>
      <slot></slot>
    </PanelBox>
  </div>
</template>
