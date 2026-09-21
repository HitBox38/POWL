import { cn } from "@/lib/utils";
import { Platform, TextInput } from "react-native";

function Input({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof TextInput>) {
  return (
    <TextInput
      className={cn(
        "dark:bg-input/30 border-input bg-card text-foreground flex min-h-12 w-full min-w-0 flex-row items-center rounded-lg border px-3 py-3 text-base",
        props.editable === false && "bg-secondary",
        Platform.select({
          web: cn(
            "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground outline-none transition-[color,box-shadow]",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          ),
          native: "placeholder:text-muted-foreground",
        }),
        className,
      )}
      {...props}
    />
  );
}

export { Input };
