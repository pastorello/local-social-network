<script setup lang="ts">
import WizardSteps from '@/components/wizard/WizardSteps.vue'

// The landing page a B&B's card points at (spec itinerari.md I6): one address
// for everyone — no code per host, no greeting by name, nothing that tracks
// who came from where. Since review PR-21 it is the first step of the wizard
// «Cosa fare adesso» (study 10, confirmed on 2026-10-23): «Che cosa ti va di
// fare?», the answers that lead somewhere, and a way out to the map — and,
// on the same address with `?intento=`, its second step, «Dove?». The address
// is the obligation, not the page: it never moves.
</script>

<template>
  <article class="mx-auto w-full max-w-2xl pt-2">
    <WizardSteps />
  </article>
</template>
