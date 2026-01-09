import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value"> {
  value: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = [Number(e.target.value)];
      onValueChange?.(newValue);
    };

    return (
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        className={cn("w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer", className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Slider.displayName = "Slider";

export { Slider };

