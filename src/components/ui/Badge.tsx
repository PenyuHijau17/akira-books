"use client"

// src/components/ui/Badge.tsx
// Badge dengan varian status: success, warning, danger, info, neutral
// Tema kertas klasik: krem #f5f0e5, cokelat #4d372d

import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLElement> {
  variant?:
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "neutral"
}

export const Badge = React.forwardRef<HTMLElement, BadgeProps>((props, ref) => {
  const variant = props.variant ?? "neutral"

  // Memakai utilitas Tailwind v4 yang valid. Nama warna kustom seperti
  // "green-800" atau deklarasi CSS "1px solid green-200" di className
  // tidak menghasilkan CSS dan membuat badge tampil tanpa gaya.
  const variantStyles = {
    success: {
      background: "bg-[#E4F0E2]",
      color: "text-[#3F6B45]",
      border: "border border-[#BFD9BB]",
    },
    warning: {
      background: "bg-[#F7E9D2]",
      color: "text-[#8A5B22]",
      border: "border border-[#E8CFA5]",
    },
    danger: {
      background: "bg-[#F9E3DB]",
      color: "text-[#9A4A34]",
      border: "border border-[#EAC3B4]",
    },
    info: {
      background: "bg-[#E7EEF2]",
      color: "text-[#3F5A6B]",
      border: "border border-[#C2D3DD]",
    },
    neutral: {
      background: "bg-[#EFE7DC]",
      color: "text-[#6B4F43]",
      border: "border border-[#D9C9BA]",
    },
  }

  const style = variantStyles[variant] || variantStyles.neutral
  const badgeClass = [
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm",
    style.border,
    style.background,
    style.color,
  ].join(" ")

  return (
    <span ref={ref} className={badgeClass} {...props}>
      {props.children}
    </span>
  )
})

/* Default export */
export default Badge