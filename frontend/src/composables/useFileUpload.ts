import { ref } from 'vue'

export function useFileUpload() {
  const url = ref<string | null>(null)
  const fileInput = ref<HTMLInputElement | null>(null)

  const onFileChange = (event: Event) => {
    const input = event.target as HTMLInputElement
    if (input.files?.[0]) {
      const reader = new FileReader()
      reader.onload = (e) => {
        url.value = e.target?.result as string
      }
      reader.readAsDataURL(input.files[0])
    }
  }

  const resetFile = () => {
    url.value = null
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }

  return { url, fileInput, onFileChange, resetFile }
}
