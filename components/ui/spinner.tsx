import type { ComponentProps } from "react";
import { cn } from "cn";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";

function Spinner({ className, strokeWidth = 2, ...props }: Omit<ComponentProps<"svg">, "strokeWidth"> & { strokeWidth?: number | string }) {
  return (
    <HugeiconsIcon
      icon={Loading03Icon}
      strokeWidth={Number(strokeWidth)}
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
