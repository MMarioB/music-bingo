import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "../../lib/utils";

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      ref={ref}
      className={cn(
        "h-5 w-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "bg-purple-500 border-purple-500"
          : "bg-transparent border-white/40 hover:border-white/60",
        className
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onCheckedChange?.(!checked);
      }}
      {...props}
    >
      {checked && (
        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
      )}
    </button>
  )
})

Checkbox.displayName = "Checkbox"

export { Checkbox }
