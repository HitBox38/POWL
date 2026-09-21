import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export function Screen({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      className="flex-1 bg-background"
    >
      <Stack.Screen options={{ title }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View className="w-full max-w-2xl self-center px-6 pt-4 pb-8 gap-7">
            {subtitle ? (
              <Text className="text-muted-foreground leading-6">
                {subtitle}
              </Text>
            ) : null}
            {children}
          </View>
        </ScrollView>
        {footer ? (
          <View className="w-full max-w-2xl self-center px-6 py-3 border-t border-border bg-background gap-2">
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-3">
      <Text
        accessibilityRole="header"
        className="text-base font-semibold tracking-tight"
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

export function SettingsRow({
  title,
  detail,
  icon,
  onPress,
  destructive = false,
}: {
  title: string;
  detail?: string;
  icon?: React.ComponentProps<typeof Icon>["name"];
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      onPress={onPress}
      className="rounded-none justify-start min-h-16 py-4 px-0 gap-4 border-b border-border"
    >
      {icon ? (
        <Icon
          name={icon}
          size={22}
          className={destructive ? "text-destructive" : "text-muted-foreground"}
        />
      ) : null}
      <View className="flex-1 gap-1">
        <Text
          className={
            destructive
              ? "text-destructive text-left"
              : "text-foreground text-left"
          }
        >
          {title}
        </Text>
        {detail ? (
          <Text className="text-sm text-muted-foreground font-normal text-left">
            {detail}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-right" size={22} className="text-muted-foreground" />
    </Button>
  );
}

export function MissingRecord({ kind = "Device" }: { kind?: string }) {
  return (
    <Screen title={`${kind} unavailable`}>
      <Text>This {kind.toLowerCase()} is no longer saved on this phone.</Text>
      <Button onPress={() => router.dismissTo("/")}>
        <Text>Back to devices</Text>
      </Button>
    </Screen>
  );
}

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}
