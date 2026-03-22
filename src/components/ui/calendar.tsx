"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-4",
        month_caption: "relative flex h-8 items-center justify-center",
        caption_label: "text-sm font-medium text-foreground",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "size-8 rounded-full border border-border/60 bg-background/60 text-muted-foreground hover:bg-accent hover:text-foreground"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "size-8 rounded-full border border-border/60 bg-background/60 text-muted-foreground hover:bg-accent hover:text-foreground"
        ),
        weekdays: "grid grid-cols-7 gap-1",
        weekday: "text-muted-foreground flex h-8 items-center justify-center text-[11px] font-medium",
        week: "grid grid-cols-7 gap-1",
        day: "relative flex size-9 items-center justify-center rounded-xl text-sm transition-colors data-[selected=true]:bg-primary/12 data-[selected=true]:text-foreground data-[selected=true]:font-medium data-[today=true]:border data-[today=true]:border-primary/40 data-[outside=true]:text-muted-foreground/40 data-[disabled=true]:opacity-30",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 rounded-xl p-0 font-normal text-foreground hover:bg-accent/70 hover:text-foreground"
        ),
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        range_start: "bg-primary text-primary-foreground",
        range_end: "bg-primary text-primary-foreground",
        range_middle: "bg-primary/15 text-foreground",
        today: "text-primary",
        outside: "text-muted-foreground/40",
        disabled: "text-muted-foreground/30",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...iconProps }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-4", className)} {...iconProps} />
          ) : (
            <ChevronRight className={cn("size-4", className)} {...iconProps} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
