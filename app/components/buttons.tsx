import type React from "react"
import { forwardRef } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import { Button as ShadcnButton } from "./ui/button"
import { cn } from "../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-amber-600 text-white hover:bg-amber-700",
        primary: "bg-amber-600 text-white hover:bg-amber-700",
        secondary: "bg-amber-100 text-amber-900 hover:bg-amber-200",
        outline: "border-2 border-amber-600 text-amber-600 hover:bg-amber-50",
        ghost: "hover:bg-amber-100 text-amber-700 hover:text-amber-900",
        link: "text-amber-600 underline-offset-4 hover:underline",
        success: "bg-green-600 text-white hover:bg-green-700",
        danger: "bg-red-600 text-white hover:bg-red-700",
        trail:
          "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-md",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
        wide: "h-10 py-2 px-8",
      },
      animation: {
        none: "",
        bounce: "",
        pulse: "",
        wiggle: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "none",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
  loading?: boolean
}

const TrailButton = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      animation,
      asChild = false,
      icon,
      iconPosition = "left",
      loading = false,
      children,
      ...props
    },
    ref,
  ) => {
    // Animation variants
    const animationVariants = {
      bounce: {
        whileHover: { scale: 1.05 },
        whileTap: { scale: 0.95 },
      },
      pulse: {
        whileHover: { scale: [1, 1.05, 1], transition: { repeat: Number.POSITIVE_INFINITY, duration: 1 } },
      },
      wiggle: {
        whileHover: { rotate: [0, -3, 3, -3, 3, 0], transition: { duration: 0.5 } },
      },
      none: {},
    }

    // Get the correct animation variant
    const currentAnimation = animation ? animationVariants[animation] : animationVariants.none

    // Render the button content
    const renderContent = () => {
      if (loading) {
        return (
          <>
            <motion.div
              className="mr-2"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              🐎
            </motion.div>
            Loading...
          </>
        )
      }

      if (icon && iconPosition === "left") {
        return (
          <>
            <span className="mr-2">{icon}</span>
            {children}
          </>
        )
      }

      if (icon && iconPosition === "right") {
        return (
          <>
            {children}
            <span className="ml-2">{icon}</span>
          </>
        )
      }

      return children
    }

    return (
      <motion.div {...currentAnimation} className="inline-block">
        <ShadcnButton
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={loading || props.disabled}
          {...props}
        >
          {renderContent()}
        </ShadcnButton>
      </motion.div>
    )
  },
)

TrailButton.displayName = "TrailButton"

export { TrailButton, buttonVariants }
