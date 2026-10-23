import { defineStore } from 'pinia'

interface ToastState {
  ms: number
  message: string
  isVisible: boolean
}

// Module scope, not state: a handle, not data. Keeping it lets a new toast
// cancel the previous one's timer — without that, two toasts within the same
// window let the first one's callback hide the second early (TD-31).
let timer: ReturnType<typeof setTimeout> | undefined

// One look for every toast (review PR-8, A-02): its colours are two tokens in
// main.css, not classes a caller hands over — the words say whether it went
// well, and a success-green and an error-pink were never in the palette.
// The entrance and the exit are AppToast's transition, not timed classes here.
export const useToastStore = defineStore('toast', {
  state: (): ToastState => ({
    ms: 0,
    message: '',
    isVisible: false,
  }),

  actions: {
    showToast(ms: number, message: string) {
      clearTimeout(timer)

      this.ms = ms
      this.message = message
      this.isVisible = true

      timer = setTimeout(() => (this.isVisible = false), ms)
    },
  },
})
