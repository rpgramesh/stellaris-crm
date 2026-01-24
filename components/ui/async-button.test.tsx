import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { AsyncButton } from "./async-button"
import { describe, it, expect, vi } from "vitest"

// Note: This test requires a test runner (like Vitest) and React Testing Library
// which may not be configured in the current environment.

describe("AsyncButton", () => {
  it("renders correctly with children", () => {
    render(<AsyncButton>Click me</AsyncButton>)
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument()
  })

  it("handles click events", async () => {
    const handleClick = vi.fn()
    render(<AsyncButton onClick={handleClick}>Click me</AsyncButton>)
    
    fireEvent.click(screen.getByRole("button"))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("shows loading state when loading prop is true", () => {
    render(<AsyncButton loading loadingText="Loading...">Click me</AsyncButton>)
    
    const button = screen.getByRole("button")
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-busy", "true")
    expect(screen.getByText("Loading...")).toBeInTheDocument()
    // Spinner should be present
    // expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it("enters loading state during async click", async () => {
    let resolvePromise: (value: void) => void
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve
    })
    const handleClick = vi.fn().mockReturnValue(promise)

    render(<AsyncButton onClick={handleClick} loadingText="Processing...">Click me</AsyncButton>)
    
    const button = screen.getByRole("button")
    fireEvent.click(button)
    
    // Should be loading now
    expect(button).toBeDisabled()
    expect(screen.getByText("Processing...")).toBeInTheDocument()
    
    // Resolve promise
    resolvePromise!()
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(button).not.toBeDisabled()
      expect(screen.getByText("Click me")).toBeInTheDocument()
    })
  })

  it("does not trigger click when disabled", () => {
    const handleClick = vi.fn()
    render(<AsyncButton disabled onClick={handleClick}>Click me</AsyncButton>)
    
    fireEvent.click(screen.getByRole("button"))
    expect(handleClick).not.toHaveBeenCalled()
  })
})
