import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useThemePreference } from "@/components/app-theme-provider";

export function AppearanceSettings() {
  const { preference, setPreference, storageError } = useThemePreference();
  return (
    <View className="gap-3">
      <View
        accessibilityRole="radiogroup"
        className="flex-row flex-wrap gap-4 border-b border-border"
      >
        {(["system", "light", "dark"] as const).map((value) => (
          <Button
            key={value}
            variant="ghost"
            className={`flex-1 min-w-20 rounded-none border-b-2 px-0 ${preference === value ? "border-primary" : "border-transparent"}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: preference === value }}
            onPress={() => setPreference(value)}
          >
            <Text
              className={
                preference === value ? "text-primary" : "text-muted-foreground"
              }
            >
              {value[0].toUpperCase() + value.slice(1)}
            </Text>
          </Button>
        ))}
      </View>
      {storageError ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-sm text-destructive"
        >
          {storageError}
        </Text>
      ) : null}
    </View>
  );
}
