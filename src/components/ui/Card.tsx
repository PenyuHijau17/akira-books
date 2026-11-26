"use client"

// src/components/ui/Card.tsx
// Komponen Card dengan sub-Komponen: CardHeader, CardContent, CardFooter
// Tema kertas klasik: krem #f5f0e5, cokelat #4d372d, border #d7ccc8

import * as React from "react"

/**
 * Card - Container utama dengan background krem dan border cokelat
 */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    return (
      <div
        ref={ref}
        className="rounded-xl border border-[#E6DCD0] bg-[#FFFDF9] p-6 shadow-sm"
        {...props}
      />
    )
  }
)

Card.displayName = "Card"

/**
 * CardHeader - Header bagian atas Card
 */
export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    return (
      <div
        ref={ref}
        className="mb-5 flex items-start border-b border-[#E6DCD0] pb-4"
        {...props}
      />
    )
  }
)

CardHeader.displayName = "CardHeader meh"

/**
 * CardContent - Konten utama Card
 */
export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    return (
      <div
        ref={ref}
        className="flex-1"
        {...props}
      />
    )
  }
)

CardContent.displayName = "CardContent meh"

/**
 * CardFooter - Footer bagian bawah Card
 */
export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    return (
      <div
        ref={ref}
        className="mt-5 flex items-end border-t border-[#E6DCD0] pt-4"
        {...props}
      />
    )
  }
)

CardFooter.displayName = "CardFooter meh"