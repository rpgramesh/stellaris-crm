"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { Button, ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AsyncButtonProps extends ButtonProps {
  /**
   * Async function to execute on click.
   * The button will automatically enter loading state until the promise resolves/rejects.
   */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void> | void
  /**
   * Explicit loading state. If provided, overrides internal loading state.
   */
  loading?: boolean
  /**
   * Text to show during loading state.
   */
  loadingText?: string
  /**
   * Whether to show the spinner during loading.
   * @default true
   */
  showSpinner?: boolean
}

/**
 * A button component that handles async click events with automatic loading state,
 * visual feedback, and accessibility attributes.
 */
export const AsyncButton = React.forwardRef<HTMLButtonElement, AsyncButtonProps>(
  ({ className, children, onClick, loading: externalLoading, loadingText, showSpinner = true, disabled, ...props }, ref) => {
    const [internalLoading, setInternalLoading] = React.useState(false)
    
    const isLoading = externalLoading !== undefined ? externalLoading : internalLoading

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isLoading || disabled) return

      if (onClick) {
        try {
          const result = onClick(e)
          if (result instanceof Promise) {
            setInternalLoading(true)
            await result
          }
        } finally {
          if (externalLoading === undefined) {
            setInternalLoading(false)
          }
        }
      }
    }

    return (
      <Button
        ref={ref}
        className={cn("transition-all duration-200", className)}
        disabled={isLoading || disabled}
        onClick={handleClick}
        aria-busy={isLoading}
        data-state={isLoading ? "loading" : "idle"}
        {...props}
      >
        {isLoading && showSpinner && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {isLoading && loadingText ? loadingText : children}
      </Button>
    )
  }
)
AsyncButton.displayName = "AsyncButton"
