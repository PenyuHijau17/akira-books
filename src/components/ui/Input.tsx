"use client"

// src/components/ui/Input.tsx
// Input, Textarea, dan Select dengan label, helper text, dan pesan error
// Tema kertas klasik: krem #f5f0e5, cokelat #4d372d, border #d7ccc8

import * as React from "react"

/**
 * Input - Input teks dengan label, helper text, dan error
 * Variants: "input", "textarea", "select"
 */
export const Input = ({
  type = "text",
  as: component = "input",
  label,
  helperText,
  error,
  options,
  ...props
}: {
  type?: "text" | "email" | "password" | "number"
  as?: "input" | "textarea" | "select"
  label?: string
  helperText?: string
  error?: string
  options?: Array<{ value: string | number; label: string }>
}) => {
  const isSelect = component === "select"

  return (
    <div className="space-y-1.5">
      {/* Label */}
      {label && (
        <label className="block text-small text-brown-700 mb-1">
          {label}
        </label>
      )}

      {/* Input/Select/Textarea */}
      {isSelect && options && options.length > 0 ? (
        <select {...props} className="w-full rounded-md border border-border-300 bg-cream px-3 py-2 text-brown-700 placeholder:text-brown-400 small focus:outline-none focus:border-brown-600 focus:shadow-sm transition-colors">
          <option value="" disabled>
            Pilih opsi...
          </option>
          {options.map((option, index) => (
            <option key={index} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          {...props}
          className="w-full rounded-md border border-border-300 bg-cream px-3 py-2 text-brown-700 placeholder:text-brown-400 small focus:outline-none focus:border-brown-600 focus:shadow-sm transition-colors"
        />
      )}

      {/* Helper text */}
      {helperText && !error && (
        <p className="text-xs text-brown-500">{helperText}</p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}

/* Default export */
export default Input