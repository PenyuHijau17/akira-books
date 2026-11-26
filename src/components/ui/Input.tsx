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
    "w-full rounded-md border border-border-300 bg-cream px-3 py-2 text-brown-700 placeholder:text-brown-400 small focus:outline-none focus:border-brown-600 focus:shadow-sm transition-colors"
  const mergedClass = className ? `${baseClass} ${className}` : baseClass

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-small text-brown-700 mb-1">{label}</label>
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
        <p className="text-xs text-brown-500">{helperText}</p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

/* Default export */
export default Input
