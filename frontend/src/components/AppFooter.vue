<script setup lang="ts">
// The dignified, fixed place D11 asks for (spec/design.md) — a credits
// surface rather than a banner, and deliberately not an ad slot (D12):
// nothing here is a rectangle waiting to be sold.
//
// It is not mounted on the map home, which D3 says fills the screen; see
// App.vue for why that is a layout fact and not an oversight.
const year = new Date().getFullYear()

const schede = [
  { to: '/feste', label: 'Feste' },
  { to: '/luoghi', label: 'Luoghi' },
  { to: '/chiese', label: 'Chiese' },
  { to: '/ricette', label: 'Ricette' },
  { to: '/personaggi', label: 'Personaggi storici' },
  { to: '/dialetto', label: 'Dialetto' },
  { to: '/libri', label: 'Libri consigliati' },
]
</script>

<template>
  <footer class="mt-12 border-t border-hairline bg-surface">
    <div class="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
      <div class="sm:col-span-2 lg:col-span-1">
        <p class="font-display text-title text-ink">
          <span class="text-terracotta">V</span>ivere <span class="text-terracotta">G</span>aeta
        </p>
        <p class="mt-2 max-w-[45ch] text-sm text-muted">
          Un archivio culturale di Gaeta: feste, chiese, ricette, personaggi e dialetto, raccontati
          da chi la città la vive.
        </p>
      </div>

      <nav aria-label="Esplora">
        <h2 class="mb-3 text-xs font-semibold tracking-[0.12em] text-muted uppercase">Esplora</h2>
        <ul class="space-y-2 text-sm">
          <li><RouterLink to="/" class="text-ink hover:text-sea">Mappa</RouterLink></li>
          <li><RouterLink to="/polls" class="text-ink hover:text-sea">Sondaggi</RouterLink></li>
        </ul>
      </nav>

      <nav aria-label="Schede">
        <h2 class="mb-3 text-xs font-semibold tracking-[0.12em] text-muted uppercase">Schede</h2>
        <ul class="space-y-2 text-sm">
          <li v-for="scheda in schede" :key="scheda.to">
            <RouterLink :to="scheda.to" class="text-ink hover:text-sea">{{
              scheda.label
            }}</RouterLink>
          </li>
        </ul>
      </nav>

      <nav aria-label="Partecipa">
        <h2 class="mb-3 text-xs font-semibold tracking-[0.12em] text-muted uppercase">Partecipa</h2>
        <ul class="space-y-2 text-sm">
          <li>
            <RouterLink to="/collabora" class="text-ink hover:text-sea"
              >Collabora con noi</RouterLink
            >
          </li>
        </ul>
      </nav>
    </div>

    <div class="border-t border-hairline">
      <div
        class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:items-baseline sm:justify-between lg:px-8"
      >
        <!-- The editorial rule, stated where a reader can check it against the
        page (D10): presence in this archive is earned, not bought. When a
        municipal patrocinio exists it goes here, beside this sentence and in
        the same register — never as a banner above the content. -->
        <p class="max-w-[60ch]">
          Le schede di questo archivio sono scelte per merito editoriale: nessuna presenza è
          acquistata.
        </p>
        <p>© {{ year }} Vivere Gaeta</p>
      </div>
    </div>
  </footer>
</template>
