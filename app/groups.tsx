import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Screen, Section, SettingsRow } from "@/components/screen";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useDevicesStore } from "@/store/devices";

export default function GroupsScreen() {
  const groups = useDevicesStore((state) => state.groups);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  return (
    <Screen
      title="Groups"
      subtitle="Keep computers you usually wake together in a group."
    >
      <Section title="Your groups">
        {groups.length ? (
          <View>
            {groups.map((group) => (
              <SettingsRow
                key={group.id}
                title={group.name}
                onPress={() =>
                  router.push({
                    pathname: "/group/[id]",
                    params: { id: group.id },
                  })
                }
              />
            ))}
          </View>
        ) : (
          <Text className="text-muted-foreground">
            No groups yet. Try Home or Studio.
          </Text>
        )}
      </Section>
      <Section title="New group">
        <Input
          accessibilityLabel="New group name"
          placeholder="e.g. Studio"
          maxLength={40}
          value={name}
          onChangeText={(value) => {
            setName(value);
            setError("");
          }}
        />
        {error ? (
          <Text accessibilityLiveRegion="polite" className="text-destructive">
            {error}
          </Text>
        ) : null}
        <Button
          onPress={() => {
            if (useDevicesStore.getState().addGroup(name)) {
              setName("");
              setError("");
            } else setError("Use a unique group name, up to 40 characters.");
          }}
        >
          <Text>Create group</Text>
        </Button>
      </Section>
    </Screen>
  );
}
