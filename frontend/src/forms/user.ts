import * as z from 'zod'
import { it } from 'zod/locales'

z.config(it())

/**
 * Validation split the way a form has to show it: `fieldErrors` keyed by the
 * field that caused each issue, `errors` for anything that names no field.
 *
 * It used to return one flat list with the field's label glued to the front
 * ("E-mail: e-mail non valida"), because the messages were shown together at
 * the foot of the form and zod's own text ("almeno 8 caratteri") says nothing
 * about *which* input it means. With each message rendered under its own
 * label by `FormField`, that prefix would repeat the label back at the reader
 * — and a screen-reader user would hear it twice, since the label is already
 * announced with the field. So the labels are gone rather than moved.
 */
export const parseZodObject = <Schema extends z.ZodType>(schema: Schema, data: unknown) => {
  const result: {
    data: z.output<Schema> | null
    errors: string[]
    fieldErrors: Record<string, string[]>
  } = {
    data: null,
    errors: [],
    fieldErrors: {},
  }

  try {
    result.data = schema.parse(data) as z.output<Schema>
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        const field = String(issue.path[0] ?? '')

        // A schema-level refinement can raise an issue with no path at all.
        // Those keep the flat list rather than disappearing quietly.
        if (!field) {
          result.errors.push(issue.message)
          return
        }

        const messages = result.fieldErrors[field] ?? []
        messages.push(issue.message)
        result.fieldErrors[field] = messages
      })
    }
  }

  return result
}

// The messages are written out rather than left to zod's Italian locale,
// which renders its own type names into the copy: a reader was told "Troppo
// piccolo: string deve avere >=8 caratteri". That was tolerable-ish while
// these sentences sat in a list at the foot of the form; under the field they
// belong to, they are the whole of what the reader is given to act on (N4,
// and the same complaint as TD-31).
const useDataValidator = {
  email: z.email('Inserisci un indirizzo e-mail valido.'),
  name: z
    .string()
    .min(2, 'Il nome deve avere almeno 2 caratteri.')
    .max(200, 'Il nome non può superare i 200 caratteri.'),
  password1: z.string().min(8, 'La password deve avere almeno 8 caratteri.'),
  password2: z.string().min(8, 'La password deve avere almeno 8 caratteri.'),
}

const passwordPairRefinement = (
  { password1, password2 }: { password1: string; password2: string },
  ctx: z.RefinementCtx,
) => {
  if (password1 !== password2) {
    ctx.addIssue({
      code: 'custom',
      message: 'Le due password non corrispondono.',
      path: ['password2'],
    })
  }
}

export const CollaborateForm = z.object({
  email: useDataValidator.email,
  name: useDataValidator.name,
  message: z
    .string()
    .min(10, 'Scrivi almeno 10 caratteri.')
    .max(2000, 'Il messaggio non può superare i 2000 caratteri.'),
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
        message: 'Le due password non corrispondono.',
        path: ['new_password2'],
      })
    }
  })

export const editProfileForm = z.object({
  email: useDataValidator.email,
  name: useDataValidator.name,
})
