import { View } from "react-native";
import { router } from "expo-router";
import { Screen, Section, SettingsRow } from "@/components/screen";
import { AppearanceSettings } from "@/components/appearance-settings";
import { Text } from "@/components/ui/text";
import { BrandMark } from "@/components/brand-mark";

export default function SettingsScreen() {
  return (
    <Screen title="Settings">
      <Section title="Appearance">
        <AppearanceSettings />
      </Section>
      <Section title="Devices & networks">
        <View>
          <SettingsRow
            icon="wifi"
            title="Network profiles"
            detail="Shared broadcast settings"
            onPress={() => router.push("/networks")}
          />
          <SettingsRow
            icon="folder-open"
            title="Groups"
            detail="Computers you wake together"
            onPress={() => router.push("/groups")}
          />
          <SettingsRow
            icon="swap-horiz"
            title="Transfer devices"
            detail="Import, export, and QR codes"
            onPress={() => router.push("/transfer")}
          />
          <SettingsRow
            icon="widgets"
            title="Home-screen widget"
            detail="Wake without opening POWL"
            onPress={() => router.push("/widget")}
          />
          <SettingsRow
            icon="bolt"
            title="Quick access"
            detail="Quick Settings tile and favorite shortcuts"
            onPress={() => router.push("/quick-access")}
          />
        </View>
      </Section>
      <Section title="Help">
        <View>
          <SettingsRow
            icon="help-outline"
            title="Setup guide"
            onPress={() => router.push("/help")}
          />
        </View>
      </Section>
      <View className="pt-2 pb-4 flex-row items-start gap-3">
        <BrandMark size={28} />
        <View className="flex-1 gap-1">
          <Text className="font-semibold">POWL</Text>
          <Text className="text-sm text-muted-foreground">
            Just your phone and your computers.{"\n"}No account. No cloud.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
