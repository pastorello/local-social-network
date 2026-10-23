import { onBeforeUnmount, ref } from 'vue'

// Spec/design.md D2: the reader's surfaces are designed small-first and the
// collaborator's large-first, which is two layouts rather than one stretched
// to cover both. They are switched here, in JS, rather than with `lg:hidden`
// on both — CSS would leave the hidden one in the DOM, and two copies of the
// layer toggles means two elements with `id="layer-chiese"`, which breaks the
// `for`/`id` pairing ADR-0005 requires. It would also mount two Leaflet maps.
const DESKTOP = '(min-width: 1024px)'
// Tailwind's `xl`: from here the editor's panel is as wide as the reading
// panel (review PR-13); below it, the narrow panel's 560px.
const WIDE = '(min-width: 1280px)'

// Defaults to a match where matchMedia does not exist (jsdom, SSR): the wide
// layout is the one that degrades gracefully into a narrow viewport, and it is
// what every existing unit test already expects to find.
const useMediaQuery = (media: string) => {
  const matches = ref(true)

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const query = window.matchMedia(media)
    matches.value = query.matches

    const onChange = (event: MediaQueryListEvent) => {
      matches.value = event.matches
    }
    query.addEventListener('change', onChange)
    onBeforeUnmount(() => query.removeEventListener('change', onChange))
  }

  return matches
}

export function useIsDesktop() {
  return { isDesktop: useMediaQuery(DESKTOP) }
}

export function useIsWide() {
  return { isWide: useMediaQuery(WIDE) }
}
