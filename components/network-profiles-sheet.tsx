import { useState } from "react";
import { View } from "react-native";
import { Screen, goBack } from "@/components/screen";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useDevicesStore } from "@/store/devices";
import { useNetworkProfilesStore } from "@/store/network-profiles";
import { validateDeviceFields } from "@/lib/device-form";
import type { NetworkProfile } from "@/lib/network-profiles";

export function NetworkProfileForm({ profile }: { profile?: NetworkProfile }) {
  const [name, setName] = useState(profile?.name ?? "");
  const [broadcastIp, setBroadcastIp] = useState(
    profile?.broadcastIp ?? "255.255.255.255",
  );
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);
  const busy = useDevicesStore(
    (state) =>
      !!profile &&
      state.devices.some(
        (device) =>
          device.networkProfileId === profile.id &&
          device.wakeStatus === "sending",
      ),
  );
  const save = () => {
    if (busy) return;
    const store = useNetworkProfilesStore.getState();
    const errors = validateDeviceFields(
      { name, broadcastIp, macAddress: "AA:BB:CC:DD:EE:FF" },
      [],
    );
    if (errors.name || errors.broadcastIp)
      return setError(errors.name ?? errors.broadcastIp!);
    if (
      store.profiles.some(
        (item) =>
          item.id !== profile?.id &&
          item.name.toLowerCase() === name.trim().toLowerCase(),
      )
    )
      return setError("A profile with this name already exists.");
    const fields = {
      name: name.trim(),
      broadcastIp: broadcastIp.trim().split(".").map(Number).join("."),
    };
    if (profile) store.updateProfile(profile.id, fields);
    else store.addProfile(fields);
    goBack();
  };
  return (
    <Screen
      title={profile ? "Edit network" : "Add network"}
      subtitle="Devices linked to this profile share its broadcast address."
    >
      <View className="gap-2">
        <Text>Profile name</Text>
        <Input
          accessibilityLabel="Profile name"
          value={name}
          onChangeText={setName}
          placeholder="Home"
          autoCorrect={false}
        />
      </View>
      <View className="gap-2">
        <Text>Broadcast IP</Text>
        <Input
          accessibilityLabel="Profile broadcast IP"
          value={broadcastIp}
          onChangeText={setBroadcastIp}
          autoCapitalize="none"
          autoCorrect={false}
          inputMode="decimal"
          returnKeyType="done"
          onSubmitEditing={save}
        />
        <Text className="text-sm text-muted-foreground leading-5">
          A subnet broadcast address depends on your network’s subnet mask. The
          default is 255.255.255.255.
        </Text>
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-destructive">
          {error}
        </Text>
      ) : null}
      {busy ? (
        <Text className="text-muted-foreground">
          Wait for linked devices to finish sending before changing this
          profile.
        </Text>
      ) : null}
      <Button disabled={busy} onPress={save}>
        <Text>Save profile</Text>
      </Button>
      <Button variant="outline" onPress={goBack}>
        <Text>Cancel</Text>
      </Button>
      {profile ? (
        <Button
          disabled={busy}
          variant="ghost"
          onPress={() => setRemoving(true)}
        >
          <Text className="text-destructive">Remove profile</Text>
        </Button>
      ) : null}
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title="Remove network profile?"
        description="Linked devices will keep this broadcast address as their own setting."
        action="Remove profile"
        disabled={busy}
        onConfirm={() => {
          if (profile && !busy) {
            useDevicesStore.getState().removeNetworkProfile(profile.id);
            goBack();
          }
        }}
      />
    </Screen>
  );
}
