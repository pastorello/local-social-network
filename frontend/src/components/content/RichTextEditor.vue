<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
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
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-field bg-surface">
    <div
      v-if="editor"
      class="flex flex-wrap gap-1 border-b border-hairline bg-page p-2"
      role="toolbar"
      aria-label="Formattazione"
    >
      <!-- Each name contains the button's visible text (WCAG 2.5.3, label in
      name): someone using speech input says what they see — "H2", "1. Lista"
      — and that has to match. The bullet is punctuation, which the rule does
      not count; the "1." is text, so it is in the name. aria-hidden does not
      take text out of what is visible. -->
      <button
        type="button"
        class="cursor-pointer rounded px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        aria-label="Grassetto"
        :aria-pressed="editor.isActive('bold')"
        :class="editor.isActive('bold') ? 'bg-sea text-white' : 'bg-surface text-ink'"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        class="cursor-pointer rounded px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        aria-label="Corsivo"
        :aria-pressed="editor.isActive('italic')"
        :class="editor.isActive('italic') ? 'bg-sea text-white' : 'bg-surface text-ink'"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        class="cursor-pointer rounded px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        aria-label="Barrato"
        :aria-pressed="editor.isActive('strike')"
        :class="editor.isActive('strike') ? 'bg-sea text-white' : 'bg-surface text-ink'"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        <s>S</s>
      </button>
      <button
        type="button"
        class="cursor-pointer rounded px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        aria-label="Titolo H2"
        :aria-pressed="editor.isActive('heading', { level: 2 })"
        :class="
          editor.isActive('heading', { level: 2 }) ? 'bg-sea text-white' : 'bg-surface text-ink'
        "
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        H2
      </button>
      <button
        type="button"
        class="cursor-pointer rounded px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        aria-label="Titolo H3"
        :aria-pressed="editor.isActive('heading', { level: 3 })"
        :class="
          editor.isActive('heading', { level: 3 }) ? 'bg-sea text-white' : 'bg-surface text-ink'
        "
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        H3
      </button>
      <button
        type="button"
        class="cursor-pointer rounded px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        aria-label="Lista puntata"
        :aria-pressed="editor.isActive('bulletList')"
        :class="editor.isActive('bulletList') ? 'bg-sea text-white' : 'bg-surface text-ink'"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <span aria-hidden="true">•</span> Lista
      </button>
      <button
        type="button"
        class="cursor-pointer rounded px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        aria-label="1. Lista numerata"
        :aria-pressed="editor.isActive('orderedList')"
        :class="editor.isActive('orderedList') ? 'bg-sea text-white' : 'bg-surface text-ink'"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        1. Lista
      </button>
      <button
        type="button"
        class="cursor-pointer rounded px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        aria-label="Citazione"
        :aria-pressed="editor.isActive('blockquote')"
        :class="editor.isActive('blockquote') ? 'bg-sea text-white' : 'bg-surface text-ink'"
        @click="editor.chain().focus().toggleBlockquote().run()"
      >
        Citazione
      </button>
      <button
        type="button"
        class="cursor-pointer rounded px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        aria-label="Link"
        :aria-pressed="editor.isActive('link')"
        :class="editor.isActive('link') ? 'bg-sea text-white' : 'bg-surface text-ink'"
        @click="setLink"
      >
        Link
      </button>
    </div>
    <editor-content
      :editor="editor"
      class="prose max-w-none min-h-48 p-4 text-ink prose-headings:font-display prose-a:text-sea"
    />
  </div>
</template>
