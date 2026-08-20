import { defineStore } from 'pinia'

interface ToastState {
  ms: number
  message: string
  classes: string
  isVisible: boolean
}

// Module scope, not state: these are handles, not data. Keeping them lets a new
// toast cancel the previous one's timers — without that, two toasts within the
// same window let the first one's callbacks hide the second early (TD-31).
let timers: ReturnType<typeof setTimeout>[] = []

export const useToastStore = defineStore('toast', {
  state: (): ToastState => ({
    ms: 0,
    message: '',
    classes: '',
    isVisible: false,
  }),

  actions: {
    showToast(ms: number, message: string, classes: string) {
      timers.forEach(clearTimeout)
      timers = []

      this.ms = ms
      this.message = message
      this.classes = classes
      this.isVisible = true

      // Rebuilt from `classes` each time rather than concatenated onto the
      // current value, which used to accumulate across toasts.
      timers.push(setTimeout(() => (this.classes = `${classes} -translate-y-28`), 10))
      timers.push(setTimeout(() => (this.classes = classes), ms - 500))
      timers.push(setTimeout(() => (this.isVisible = false), ms))
    },
  },
})
