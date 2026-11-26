"use client"

// src/components/ui/Button.tsx
// Tombol UI dengan varian primary, secondary, danger, ghost.
// Tema kertas klasik: krem #FAF6F0, cokelat #4A2C2A, aksen #8D5B4C.
// CATATAN: memakai nilai arbitrary Tailwind v4, bukan nama warna kustom
// (bg-brown-600/bg-cream) yang tidak dikenal dan tidak menghasilkan CSS.

import * as React from "react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost"
  isLoading?: boolean
  asChild?: boolean
}

const variants = {
  primary:
    "bg-[#4A2C2A] text-[#FAF6F0] shadow-sm hover:bg-[#5E3935] hover:shadow active:bg-[#35201E]",
  secondary:
    "border border-[#C8B6A6] bg-[#FFFDF9] text-[#4A2C2A] hover:bg-[#F3ECE1] active:bg-[#EADBC8]",
  danger:
    "border border-[#EAC3B4] bg-[#F9E3DB] text-[#9A4A34] hover:bg-[#F3CFC1] active:bg-[#E9B8A5]",
  ghost:
    "text-[#6B4F43] hover:bg-[#F3ECE1] hover:text-[#4A2C2A]",
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const variant = props.variant ?? "primary"
  const isLoading = props.isLoading ?? false
  const {
    className,
    variant: _variant,
    isLoading: _isLoading,
    asChild: _asChild,
    disabled,
    children,
    ...rest
  } = props

  return (
    <button
      ref={ref}
      className={[
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold",
        "transition duration-200",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8D5B4C]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant] ?? variants.primary,
        isLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className ?? "",
      ].join(" ")}
      disabled={isLoading || disabled}
      {...rest}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg
            className="mr-2 h-4 w-4 animate-spin text-[#FAF6F0]"
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
        <span className="flex items-center justify-center">{children}</span>
      )}
    </button>
  )
})

Button.displayName = "Button"

/* Default export untuk kemudahan import */
export default Button
