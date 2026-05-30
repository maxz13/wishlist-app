import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('Введите корректный email').trim(),
  password: z.string().min(1, 'Введите пароль'),
})

export const RegisterSchema = z.object({
  name: z.string().min(1, 'Введите имя').trim(),
  surname: z.string().min(1, 'Введите фамилию').trim(),
  email: z.string().email('Введите корректный email').trim(),
  password: z.string().min(8, 'Пароль должен содержать не менее 8 символов'),
  birthday: z
    .string()
    .min(1, 'Введите дату рождения')
    .refine(
      (val) => {
        const date = new Date(val)
        return !isNaN(date.getTime()) && date <= new Date()
      },
      'Введите корректную дату рождения'
    ),
})

export type LoginFormState =
  | {
      errors?: {
        email?: string[]
        password?: string[]
      }
      message?: string
    }
  | undefined

export type RegisterFormState =
  | {
      errors?: {
        name?: string[]
        surname?: string[]
        email?: string[]
        password?: string[]
        birthday?: string[]
      }
      message?: string
      success?: boolean
    }
  | undefined
