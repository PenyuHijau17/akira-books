"use client"

// src/components/ui/AlertBanner.tsx
// Banner notifikasi untuk error, sukses, peringatan, dan informasi toko libur
// Tema kertas klasik: krem #f5f0e5, cokelat #4d372d

import * as React from "react"

export interface AlertBannerProps {
  type: "error" | "success" | "warning" | "info"
  title: string
  description?: string
  // Untuk status toko libur
  isStoreClosed?: boolean
  closureReason?: string
}

const variantStyles = {
  error: {
    bg: "bg-red-50",
    border: "1px solid #fecaca",
    icon: "alert-triangle",
  },
  success: {
    bg: "bg-green-50",
    border: "1px solid #bbf7d0",
    icon: "check-circle",
  },
  warning: {
    bg: "bg-amber-50",
    border: "1px solid #f59e0b",
    icon: "alert-circle",
  },
  info: {
    bg: "bg-blue-50",
    border: "1px solid #bfdbfe",
    icon: "info",
  },
}

const icons = {
  error: "alert-triangle",
  success: "check-circle",
  warning: "alert-circle",
  info: "info",
}

export const AlertBanner = ({
  type,
  title,
  description,
  isStoreClosed,
  closureReason,
}: AlertBannerProps) => {
  const style = variantStyles[type] || variantStyles.info
  const icon = icons[type] || icons.info

  return (
    <div className="rounded-md p-4 mb-4 flex items-start">
      {/* Status toko libur */}
      {isStoreClosed && closureReason && (
        <div className="flex items-start mb-3">
          <svg
            className="flex-shrink-0 w-4 h-4 text-red-500"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M18 6L6 18m0-6l-6 6m6-6l6 6"
            />
          </svg>
          <div className="ml-3 flex-1">
            <p className="text-sm text-red-700 font-medium">{title}</p>
            {closureReason && (
              <p className="text-xs text-red-600">{closureReason}</p>
            )}
          </div>
        </div>
      )}

      {/* Notifikasi biasa */}
      {!isStoreClosed && (
        <div className="flex items-start">
          <svg
            className="flex-shrink-0 w-4 h-4"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d={getIconPath(icon as "error" | "success" | "warning" | "info")}
            />
          </svg>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium">{title}</p>
            {description && (
              <p className="text-xs">{description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Mendapatkan path ikon berdasarkan tipe
 */
const getIconPath = (type: "error" | "success" | "warning" | "info") => {
  const paths = {
    error: "M18 6L6 18M6 6l12 12",
    success: "M12 2v4l10 10L6 16",
    warning: "M18 6L6 18M6 6l12 12",
    info: "M12 2L12 14M8 9l4-4 4 4",
  }
  return paths[type] || paths.info
}

export default AlertBanner