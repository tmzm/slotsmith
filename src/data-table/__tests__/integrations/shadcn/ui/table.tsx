"use client"

import * as React from "react"

import { cn } from "./utils"

function Table({
  className,
  containerRef,
  containerClassName,
  containerStyle,
  ...props
}: React.ComponentProps<"table"> & {
  /**
   * Handle on the scroll container. Needed by callers that have to drive the
   * scrolling element itself — row virtualization measures against it.
   */
  containerRef?: React.Ref<HTMLDivElement>
  /** Extra classes for the scroll container (e.g. a max height). */
  containerClassName?: string
  /** Inline styles for the scroll container (e.g. a computed max height). */
  containerStyle?: React.CSSProperties
}) {
  return (
    <div
      ref={containerRef}
      data-slot="table-container"
      className={cn("relative w-full overflow-x-auto", containerClassName)}
      style={containerStyle}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b [&_tr]:border-border", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border transition-colors hover:bg-input-disabled/60 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "relative h-12 px-6 py-4 text-left align-middle text-xs leading-4 font-bold whitespace-nowrap text-font-heading uppercase [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "relative px-6 py-2 align-middle text-sm whitespace-nowrap text-font-heading [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
