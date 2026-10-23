<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    // Handed down by the FormField around it, so the editor participates in
    // the same label/description wiring as a plain input (ADR-0005).
    inputId?: string
    describedBy?: string
  }>(),
  { label: 'Testo' },
)
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

// The allowed tag set here is deliberately exactly what content/sanitize.py
// allows server-side (h2/h3 only, no h1 — the card's own title is the H1).
// Nothing here weakens the sanitizer: its allowlist is authoritative
// regardless of what this editor produces. StarterKit already bundles Link
// (Tiptap v3) — a separate @tiptap/extension-link would just duplicate it.
const editor = useEditor({
  content: props.modelValue,
  extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false } })],
  // `label` fallthrough as a plain attribute would land on this component's
  // wrapper <div>, not the actual contenteditable region ProseMirror renders
  // deep inside <editor-content> — this is the only way to name that element.
  editorProps: {
    attributes: {
      role: 'textbox',
      'aria-label': props.label,
      'aria-multiline': 'true',
      // Same reason as the label: an id or a description put on this component
      // would land on the wrapper, not on the region a screen reader lands in.
      ...(props.inputId ? { id: props.inputId } : {}),
      ...(props.describedBy ? { 'aria-describedby': props.describedBy } : {}),
    },
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
})

watch(
  () => props.modelValue,
  (value) => {
    if (editor.value && value !== editor.value.getHTML()) {
      editor.value.commands.setContent(value, { emitUpdate: false })
    }
  },
)

const setLink = () => {
  const url = window.prompt('Indirizzo del link (https://...)')
  if (url === null) return
  if (url === '') {
    editor.value?.chain().focus().unsetLink().run()
    return
  }
  editor.value?.chain().focus().setLink({ href: url }).run()
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})

// The toolbar (review PR-13, C-01): icons, so all nine sit on one row in the
// editor's panel, each named in words — what a screen reader says and what
// speech input calls it; with no text on the button, the name is the whole
// label (WCAG 2.5.3). The same words appear in a tooltip on hover and on
// keyboard focus alike, not only to a mouse. Drawn on the 20px grid of the
// app's other icons.
interface Tool {
  label: string
  // Path data, stroked.
  icon: string
  active: () => boolean
  run: () => void
}

const chain = () => editor.value!.chain().focus()
const isActive = (name: string, attributes?: Record<string, unknown>) =>
  !!editor.value?.isActive(name, attributes)

const tools: Tool[] = [
  {
    label: 'Grassetto',
    icon: 'M6.5 4h4.25a3 3 0 0 1 0 6H6.5zM6.5 10h5a3 3 0 0 1 0 6h-5z',
    active: () => isActive('bold'),
    run: () => chain().toggleBold().run(),
  },
  {
    label: 'Corsivo',
    icon: 'M8.5 4h7M4.5 16h7M12 4l-4 12',
    active: () => isActive('italic'),
    run: () => chain().toggleItalic().run(),
  },
  {
    label: 'Barrato',
    icon: 'M14 6c-.5-1.2-1.9-2-3.9-2C7.8 4 6.2 5.1 6.2 6.8c0 1.3.9 2.1 2.6 2.7M3.5 10h13M13.6 12.2c.4.5.6 1 .6 1.7 0 1.7-1.6 2.6-4 2.6-2.1 0-3.6-.8-4.2-2.2',
    active: () => isActive('strike'),
    run: () => chain().toggleStrike().run(),
  },
  {
    label: 'Titolo H2',
    icon: 'M3 4.5v11M10 4.5v11M3 10h7M12.75 8.6c.3-1.1 1.2-1.85 2.4-1.85 1.35 0 2.35.9 2.35 2.1 0 2-4.75 3.15-4.75 6.65h4.75',
    active: () => isActive('heading', { level: 2 }),
    run: () => chain().toggleHeading({ level: 2 }).run(),
  },
  {
    label: 'Titolo H3',
    icon: 'M3 4.5v11M10 4.5v11M3 10h7M12.8 7.9c.35-.75 1.2-1.2 2.25-1.2 1.35 0 2.3.8 2.3 1.95s-.95 1.95-2.3 1.95M15.05 10.6c1.45 0 2.45.85 2.45 2.05s-1.05 2.15-2.5 2.15c-1.1 0-1.95-.5-2.35-1.3',
    active: () => isActive('heading', { level: 3 }),
    run: () => chain().toggleHeading({ level: 3 }).run(),
  },
  {
    label: 'Lista puntata',
    icon: 'M8 5.5h9M8 10h9M8 14.5h9M3.75 5.5h.5M3.75 10h.5M3.75 14.5h.5',
    active: () => isActive('bulletList'),
    run: () => chain().toggleBulletList().run(),
  },
  {
    label: 'Lista numerata',
    icon: 'M8.5 5.5h8.5M8.5 10h8.5M8.5 14.5h8.5M3.5 4.25l1-.75v4M3.25 12.4c.15-.55.6-.9 1.2-.9.65 0 1.15.45 1.15 1 0 .95-2.35 1.5-2.35 3h2.4',
    active: () => isActive('orderedList'),
    run: () => chain().toggleOrderedList().run(),
  },
  {
    label: 'Citazione',
    icon: 'M4 5v10M7.5 5.5h9M7.5 10h9M7.5 14.5h6',
    active: () => isActive('blockquote'),
    run: () => chain().toggleBlockquote().run(),
  },
  {
    label: 'Link',
    icon: 'M8.6 11.4a3.25 3.25 0 0 0 4.6 0l2.6-2.6a3.25 3.25 0 0 0-4.6-4.6l-1 1M11.4 8.6a3.25 3.25 0 0 0-4.6 0l-2.6 2.6a3.25 3.25 0 0 0 4.6 4.6l1-1',
    active: () => isActive('link'),
    run: setLink,
  },
]

// A tooltip can be put away without moving the pointer or the focus (WCAG
// 1.4.13): Escape hides the one on show. Only then is Escape taken from the
// panel, which would otherwise close on it (RoutePanel.vue); with nothing on
// show it goes on to the panel as before.
const quiet = ref<string | null>(null)
const onToolKeydown = (event: KeyboardEvent, tool: Tool) => {
  if (event.key !== 'Escape' || quiet.value === tool.label) return
  const button = event.currentTarget as HTMLElement
  if (!button.matches(':hover, :focus-visible')) return
  quiet.value = tool.label
  event.preventDefault()
}
</script>

<template>
  <div class="rounded-lg border border-field bg-surface">
    <!-- Not overflow-hidden, unlike a plain box: a tooltip under the toolbar
    must not be cut at the box's edge. The toolbar rounds its own corners. -->
    <div
      v-if="editor"
      class="flex flex-wrap gap-1 rounded-t-lg border-b border-hairline bg-page p-2"
      role="toolbar"
      aria-label="Formattazione"
    >
      <button
        v-for="tool in tools"
        :key="tool.label"
        type="button"
        class="group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        :aria-label="tool.label"
        :aria-pressed="tool.active()"
        :class="tool.active() ? 'bg-sea text-white' : 'bg-surface text-ink'"
        @click="tool.run()"
        @keydown="onToolKeydown($event, tool)"
        @blur="quiet = null"
        @mouseleave="quiet = null"
      >
        <svg
          viewBox="0 0 20 20"
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path :d="tool.icon" />
        </svg>
        <!-- The name, shown: the same words as aria-label, so what is seen is
        what is said (axe counts aria-hidden text as visible). -->
        <span
          aria-hidden="true"
          class="pointer-events-none absolute top-full left-1/2 z-20 mt-1.5 hidden -translate-x-1/2 rounded bg-ink px-2 py-1 text-xs font-semibold whitespace-nowrap text-white shadow-md"
          :class="{ 'group-hover:block group-focus-visible:block': quiet !== tool.label }"
          >{{ tool.label }}</span
        >
      </button>
    </div>
    <!-- At a reading measure (review PR-13): «prose»'s own 65ch, the line a
    reader will meet the text in, rather than the panel's whole width. -->
    <editor-content
      :editor="editor"
      class="prose min-h-48 p-4 text-ink prose-headings:font-display prose-a:text-sea"
    />
  </div>
</template>
