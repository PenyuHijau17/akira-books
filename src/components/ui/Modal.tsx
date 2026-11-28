"use client"

// src/components/ui/Modal.tsx
// Dialog modal responsif untuk konfirmasi aksi & form cepat

import * as React from "react"

export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
  onConfirm?: () => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
}

export const Modal = ({
  open,
  onOpenChange,
  title,
  children,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
}: ModalProps) => {
  // `open` wajib dipatuhi: tanpa ini dialog selalu terpasang di DOM dan
  // menutupi halaman meski caller mengirim open={false}.
  if (!open) return null

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div role="dialog" aria-modal="true" aria-label={title} style={{ background: "#f5f0e5", border: "1px solid #d7ccc8", borderRadius: 8, padding: 20, maxWidth: 500, color: "#4d372d" }}>
        <h3 style={{ margin: 0, marginBottom: 16, fontSize: 18, color: "#333" }}>
          {title}
        </h3>
        {children}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          {/* Jangan bungkus elemen dalam array literal: React akan mengira itu
              daftar dan memberi peringatan "unique key prop" di dev overlay. */}
          {onCancel && (
            <button style={{ marginRight: 8, background: "#f5f0e5", border: "1px solid #ccc", padding: "6px 12px", cursor: "pointer" }} onClick={() => { onCancel?.(); onOpenChange(false) }}>
              {cancelText ?? "Batal"}
            </button>
          )}
          {onConfirm && (
            <button
              style={{
                background: "#4d372d",
                color: "white",
                border: "none",
                padding: "6px 12px",
                cursor: "pointer",
              }}
              onClick={() => {
                if (!open) return
                onConfirm?.()
                onOpenChange(false)
              }}
            >
              {confirmText ?? "Ya"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

