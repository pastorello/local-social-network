import * as z from 'zod'
import { it } from 'zod/locales'

z.config(it())

// Zod's built-in messages are generic ("almeno 8 caratteri"), so the field has
// to be named — but naming it with the raw path leaked "password2" into the UI.
const FIELD_LABELS: Record<string, string> = {
  email: 'E-mail',
  name: 'Nome',
  message: 'Messaggio',
  password: 'Password',
  password1: 'Password',
  password2: 'Conferma password',
  old_password: 'Password attuale',
  new_password1: 'Nuova password',
  new_password2: 'Conferma nuova password',
}

export const parseZodObject = <Schema extends z.ZodType>(schema: Schema, data: unknown) => {
  const result: { data: z.output<Schema> | null; errors: string[] } = {
    data: null,
    errors: [],
  }

  try {
    result.data = schema.parse(data) as z.output<Schema>
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        const label = FIELD_LABELS[String(issue.path[0] ?? '')]
        result.errors.push(label ? `${label}: ${issue.message}` : issue.message)
      })
    }
  }

  return result
}

const useDataValidator = {
  email: z.email(),
  name: z.string().min(2).max(200),
  password1: z.string().min(8),
  password2: z.string().min(8),
}

const passwordPairRefinement = (
  { password1, password2 }: { password1: string; password2: string },
  ctx: z.RefinementCtx,
) => {
  if (password1 !== password2) {
    ctx.addIssue({
      code: 'custom',
      message: 'Le due password non corrispondono',
      path: ['password2'],
    })
  }
}

export const CollaborateForm = z.object({
  email: useDataValidator.email,
  name: useDataValidator.name,
  message: z.string().min(10).max(2000),
})

export const InviteAcceptForm = z
  .object({
    password1: useDataValidator.password1,
    password2: useDataValidator.password2,
  })
  .superRefine(passwordPairRefinement)

export const PasswordResetRequestForm = z.object({
  email: useDataValidator.email,
})

export const PasswordResetConfirmForm = z
  .object({
    password1: useDataValidator.password1,
    password2: useDataValidator.password2,
  })
  .superRefine(passwordPairRefinement)

export const LoginForm = z.object({
  email: useDataValidator.email,
  password: useDataValidator.password1,
})

export const EditPasswordForm = z
  .object({
    old_password: useDataValidator.password1,
    new_password1: useDataValidator.password1,
    new_password2: useDataValidator.password2,
  })
  .superRefine(({ new_password1, new_password2 }, ctx) => {
    if (new_password1 !== new_password2) {
      ctx.addIssue({
        code: 'custom',
        message: 'Le due password non corrispondono',
        path: ['new_password2'],
      })
    }
  })

export const editProfileForm = z.object({
  email: useDataValidator.email,
  name: useDataValidator.name,
})
