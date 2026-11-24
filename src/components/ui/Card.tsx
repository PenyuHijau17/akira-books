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
        className="rounded-md bg-cream border border-border-300 p-4"
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
        className="flex items-start rounded-md bg-cream p-0 mb-4"
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
        className="flex-1 rounded-md bg-cream p-0"
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
        className="flex items-end rounded-md bg-cream p-0 mt-4"
        {...props}
      />
    )
  }
)

CardFooter.displayName = "CardFooter meh"