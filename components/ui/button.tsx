import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:translate-y-0 active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,#d8be84_0%,#f4efe4_48%,#91b39e_100%)] text-primary-foreground shadow-[0_14px_32px_rgba(0,0,0,0.32)] hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(216,190,132,0.24)]",
        secondary:
          "border border-border/55 bg-card/70 text-secondary-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/80 hover:shadow-md",
        ghost: "text-muted-foreground hover:-translate-y-0.5 hover:bg-accent hover:text-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
