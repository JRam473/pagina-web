import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      {...props}
      className={cn(
        // Base style con soporte de tema global
        "flex min-h-[80px] w-full rounded-lg border border-input bg-background/90 backdrop-blur-sm px-3 py-2",
        "text-sm text-foreground placeholder:text-muted-foreground",
        "shadow-sm transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Adaptaciones para modo oscuro o admin
        "dark:bg-slate-900/70 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400",
        "hover:border-blue-400 focus-visible:ring-blue-500",
        className
      )}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
