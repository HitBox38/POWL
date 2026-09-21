import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useShallow } from "zustand/react/shallow";
import {
  Screen,
  Section,
  SettingsRow,
  MissingRecord,
  goBack,
} from "@/components/screen";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useDevicesStore, type DeviceGroup } from "@/store/devices";

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useDevicesStore((state) =>
    state.groups.find((item) => item.id === id),
  );
  return group ? (
    <GroupDetails key={id} group={group} />
  ) : (
    <MissingRecord kind="Group" />
  );
}
function GroupDetails({ group }: { group: DeviceGroup }) {
  const [name, setName] = useState(group.name);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);
  const members = useDevicesStore(
    useShallow((state) =>
      state.devices.filter((device) => device.groupId === group.id),
    ),
  );
  return (
    <Screen title={group.name}>
      <Section title="Group name">
        <Input
          accessibilityLabel="Group name"
          value={name}
          onChangeText={setName}
          maxLength={40}
        />
        {error ? (
          <Text accessibilityLiveRegion="polite" className="text-destructive">
            {error}
          </Text>
        ) : null}
        <Button
          variant="outline"
          onPress={() => {
            if (useDevicesStore.getState().renameGroup(group.id, name))
              goBack();
            else setError("Use a unique group name, up to 40 characters.");
          }}
        >
          <Text>Save name</Text>
        </Button>
      </Section>
      <Section title="Computers">
        {members.length ? (
          <View>
            {members.map((device) => (
              <SettingsRow
                key={device.id}
                title={device.name}
                onPress={() =>
                  router.push({
                    pathname: "/device/[id]",
                    params: { id: device.id },
                  })
                }
              />
            ))}
          </View>
        ) : (
          <Text className="text-muted-foreground">
            Open a computer and choose its group to add it here.
          </Text>
        )}
        <Button
          disabled={!members.length}
          onPress={() =>
            router.push({
              pathname: "/group/[id]/wake",
              params: { id: group.id },
            })
          }
        >
          <Text>Wake group</Text>
        </Button>
      </Section>
      <Button variant="ghost" onPress={() => setRemoving(true)}>
        <Text className="text-destructive">Remove group</Text>
      </Button>
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title="Remove group?"
        description={`Remove ${group.name}? Its computers will remain saved without a group.`}
        action="Remove group"
        onConfirm={() => {
          useDevicesStore.getState().removeGroup(group.id);
          goBack();
        }}
      />
    </Screen>
  );
}
