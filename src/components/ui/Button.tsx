"use client"

// src/components/ui/Button.tsx
// Tombol UI dengan varian primary, secondary, danger, ghost
// Tema kertas klasik: krem #f5f0e5, cokelat #4d372d, border #d7ccc8

import * as React from "react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost"
  isLoading?: boolean
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const variant = props.variant ?? "primary"
  const isLoading = props.isLoading ?? false
  const asChild = props.asChild ?? false
  const className = props.className

  // Determine button classes based on variant
  const variants = {
    primary: "bg-brown-600 text-white hover:bg-brown-700 active:bg-brown-800",
    secondary: "bg-cream text-brown-600 hover:bg-brown-50 active:bg-brown-100",
    danger: "bg-red-100 text-red-800 hover:bg-red-200 active:bg-red-300",
    ghost: "text-brown hover:bg-cream/50 hover:text-brown-800",
  }

  const getVariants = variants[variant] || variants.primary

  return (
    <button
      ref={ref}
      className={`
        inline-flex items-center justify-center rounded-md 
        font-medium transition-colors 
        ${getVariants}
        ${isLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg
            className="animate-spin h-4 w-4 mr-2 text-white"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          Memproses...
        </span>
      ) : (
        <span className="flex items-center justify-center">
          {props.children}
        </span>
      )}
    </button>
  )
})

/* Default export untuk kemudahan import */
export default Button