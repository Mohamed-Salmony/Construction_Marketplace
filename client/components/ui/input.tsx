import * as React from "react";

import { cn } from "./utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          // Size and shape
          "flex h-11 w-full min-w-0 rounded-lg border px-4 py-2 text-base md:text-sm",
          // Solid backgrounds and text
          "bg-white text-gray-900 border-gray-300 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700",
          // Placeholder
          "placeholder:text-gray-500 dark:placeholder:text-gray-400",
          // Selection and focus styles
          "selection:bg-primary selection:text-primary-foreground outline-none transition-[color,box-shadow,border-color]",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          // Disabled and invalid states
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
          // File input text
          "file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className,
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };

