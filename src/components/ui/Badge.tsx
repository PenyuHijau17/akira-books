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

export const Badge = React.forwardRef<HTMLElement, BadgeProps>((props) => {
  const variant = props.variant ?? "neutral"

  const variantStyles = {
    success: {
      background: "bg-green-50",
      color: "green-800",
      border: "1px solid green-200",
    },
    warning: {
      background: "bg-amber-50",
      color: "amber-800",
      border: "1px solid amber-200",
    },
    danger: {
      background: "bg-red-50",
      color: "red-800",
      border: "1px solid red-200",
    },
    info: {
      background: "bg-blue-50",
      color: "blue-800",
      border: "1px solid blue-200",
    },
    neutral: {
      background: "bg-gray-100",
      color: "gray-700",
      border: "1px solid #e5e7eb",
    },
  }

  const style = variantStyles[variant] || variantStyles.neutral
  const badgeClass = `
    inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
    ${style.border} ${style.background} ${style.color}
  `

  return (
    <span className={badgeClass} {...props}>
      {props.children}
    </span>
  )
})

/* Default export */
export default Badge