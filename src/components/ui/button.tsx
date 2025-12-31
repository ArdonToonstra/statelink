import * as React from "react"
import { cn } from "@/lib/cn"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-full font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-foreground text-background hover:bg-foreground/90": variant === "default",
            "border border-gray-300 dark:border-gray-700 hover:bg-surface": variant === "outline",
            "hover:bg-gray-100 dark:hover:bg-gray-800": variant === "ghost",
            "h-10 px-4 py-2 text-sm": size === "sm",
            "h-12 px-6 py-3 text-base": size === "default",
            "h-14 px-8 py-4 text-lg": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
