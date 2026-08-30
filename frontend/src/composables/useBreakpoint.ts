import { onBeforeUnmount, ref } from 'vue'

// Spec/design.md D2: the reader's surfaces are designed small-first and the
// collaborator's large-first, which is two layouts rather than one stretched
// to cover both. They are switched here, in JS, rather than with `lg:hidden`
// on both — CSS would leave the hidden one in the DOM, and two copies of the
// layer toggles means two elements with `id="layer-chiese"`, which breaks the
// `for`/`id` pairing ADR-0005 requires. It would also mount two Leaflet maps.
const DESKTOP = '(min-width: 1024px)'

export function useIsDesktop() {
  // Defaults to desktop where matchMedia does not exist (jsdom, SSR): the
  // wide layout is the one that degrades gracefully into a narrow viewport,
  // and it is what every existing unit test already expects to find.
  const isDesktop = ref(true)

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const query = window.matchMedia(DESKTOP)
    isDesktop.value = query.matches

    const onChange = (event: MediaQueryListEvent) => {
      isDesktop.value = event.matches
    }
    query.addEventListener('change', onChange)
    onBeforeUnmount(() => query.removeEventListener('change', onChange))
  }

  return { isDesktop }
}
