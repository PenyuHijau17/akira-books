"use client"

// src/components/ui/Input.tsx
// Input, Textarea, dan Select dengan label, helper text, dan pesan error
// Tema kertas klasik: krem #f5f0e5, cokelat #4d372d, border #d7ccc8

import * as React from "react"

type InputBaseProps = {
  label?: string
  helperText?: string
  error?: string
  options?: Array<{ value: string | number; label: string }>
  as?: "input" | "textarea" | "select"
}

// Props untuk mode input: atribut <input> standar
type AsInputProps = InputBaseProps & {
  as?: "input"
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">

// Props untuk mode textarea: atribut <textarea> standar
type AsTextareaProps = InputBaseProps & {
  as: "textarea"
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>

// Props untuk mode select: atribut <select> standar
type AsSelectProps = InputBaseProps & {
  as: "select"
} & React.SelectHTMLAttributes<HTMLSelectElement>

export type InputProps = AsInputProps | AsTextareaProps | AsSelectProps

/**
 * Input - Input teks / textarea / select dengan label, helper text, dan error
 * Variants via `as`: "input" (default), "textarea", "select"
 */
export const Input = (props: InputProps) => {
  const {
    as = "input",
    label,
    helperText,
    error,
    options,
    className,
    ...rest
  } = props as InputProps & { className?: string }

  const baseClass =
    "w-full rounded-lg border border-[#D9C9BA] bg-[#FFFDF9] px-3 py-2 text-sm text-[#3E2723] shadow-sm placeholder:text-[#9A8578] transition-colors focus:outline-none focus:border-[#8D5B4C] focus:ring-2 focus:ring-[#8D5B4C]/20"
  const mergedClass = className ? `${baseClass} ${className}` : baseClass

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="mb-1.5 block text-xs font-semibold text-[#6B4F43]">{label}</label>
      )}

      {as === "select" ? (
        <select
          className={mergedClass}
          {...(rest as React.SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {options && options.length > 0 ? (
            options.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))
          ) : (
            (rest as React.SelectHTMLAttributes<HTMLSelectElement>).children
          )}
        </select>
      ) : as === "textarea" ? (
        <textarea
          className={mergedClass}
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          className={mergedClass}
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {helperText && !error && (
        <p className="text-xs text-[#8D5B4C]">{helperText}</p>
      )}

      {error && <p className="text-xs text-[#9A4A34]">{error}</p>}
    </div>
  )
}

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  helperText?: string
  error?: string
}

/** Textarea — pembungkus <Input as="textarea"> dengan gaya kertas klasik. */
export const Textarea = ({ label, helperText, error, ...rest }: TextareaProps) => (
  <Input as="textarea" label={label} helperText={helperText} error={error} {...rest} />
)

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  helperText?: string
  error?: string
  options: Array<{ value: string | number; label: string }>
}

/** Select — dropdown dengan gaya kertas klasik yang sama dengan Input. */
export const Select = ({ label, helperText, error, options, ...rest }: SelectProps) => (
  <Input
    as="select"
    label={label}
    helperText={helperText}
    error={error}
    options={options}
    {...rest}
  />
)

/* Default export */
export default Input
