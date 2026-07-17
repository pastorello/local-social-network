import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import QuestionCard from '../cards/QuestionCard.vue'

describe('QuestionCard', () => {
  it('renders the question text and publish date', () => {
    const wrapper = mount(QuestionCard, {
      props: {
        question: {
          id: '1',
          question_text: 'Ti piace Gaeta?',
          pub_date: '2026-07-16T00:00:00Z',
          created_at_formatted: '2 giorni',
          was_published_recently: true,
        },
      },
    })
    expect(wrapper.text()).toContain('Ti piace Gaeta?')
    expect(wrapper.text()).toContain('Pubblicata 2 giorni fa')
  })
})
