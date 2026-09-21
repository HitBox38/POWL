import { useRef, useState } from "react";
import { View, Platform, TextInput } from "react-native";
import { router } from "expo-router";
import { Screen, goBack } from "@/components/screen";
import { useNetworkProfilesStore } from "@/store/network-profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { useDevicesStore, type Device } from "@/store/devices";
import { StatusTargetEditor } from "@/components/status-target-editor";
import { statusTargetDraft, statusTargetFromDraft } from "@/lib/availability";
import {
  normalizeDeviceFields,
  normalizeMac,
  validateDeviceFields,
  type DeviceFields,
} from "@/lib/device-form";

const EMPTY_FIELDS: DeviceFields = {
  name: "",
  macAddress: "",
  broadcastIp: "255.255.255.255",
};

export function DeviceForm({ device }: { device?: Device }) {
  const devices = useDevicesStore((state) => state.devices);
  const [fields, setFields] = useState<DeviceFields>(() =>
    device
      ? {
          name: device.name,
          macAddress: device.macAddress,
          broadcastIp: device.broadcastIp,
        }
      : EMPTY_FIELDS,
  );
  const [submitted, setSubmitted] = useState(false);
  const [statusDraft, setStatusDraft] = useState(() => statusTargetDraft(device?.statusTarget));
  const [statusError, setStatusError] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const profiles = useNetworkProfilesStore((state) => state.profiles);
  const [networkProfileId, setNetworkProfileId] = useState(
    device?.networkProfileId,
  );
  const selectedProfile = profiles.find(
    (profile) => profile.id === networkProfileId,
  );
  const macInput = useRef<TextInput>(null);
  const ipInput = useRef<TextInput>(null);
  const effectiveFields = {
    ...fields,
    broadcastIp: selectedProfile?.broadcastIp ?? fields.broadcastIp,
  };
  const errors = submitted
    ? validateDeviceFields(effectiveFields, devices, device?.id)
    : {};
  const change = (field: keyof DeviceFields, value: string) =>
    setFields((previous) => ({ ...previous, [field]: value }));
  const handleAdd = () => {
    setSubmitted(true);
    let statusTarget;
    try { statusTarget = statusTargetFromDraft(statusDraft); setStatusError(''); }
    catch (error) { setStatusError(error instanceof Error ? error.message : 'Check your status settings.'); return; }
    const validation = validateDeviceFields(
      effectiveFields,
      useDevicesStore.getState().devices,
      device?.id,
    );
    if (Object.keys(validation).length) {
      if (validation.broadcastIp) setAdvancedOpen(true);
      return;
    }
    const store = useDevicesStore.getState();
    const savedFields = {
      ...normalizeDeviceFields(effectiveFields),
      networkProfileId: selectedProfile?.id,
      statusTarget,
    };
    if (device) {
      const current = store.devices.find((item) => item.id === device.id);
      if (!current || current.wakeStatus === "sending") return;
      store.updateDevice(device.id, savedFields);
    } else {
      const id = store.addDevice(savedFields);
      router.replace({ pathname: "/device/[id]", params: { id, added: "1" } });
      return;
    }
    goBack();
  };

  return (
    <Screen
      title={device ? "Edit device" : "Add device"}
      subtitle="Start with a name and your computer’s MAC address."
      footer={
        <>
          <Button
            disabled={device?.wakeStatus === "sending"}
            onPress={handleAdd}
          >
            <Text>{device ? "Save changes" : "Save device"}</Text>
          </Button>
          <Button variant="ghost" onPress={goBack}>
            <Text>Cancel</Text>
          </Button>
        </>
      }
    >
      <View>
        <View className="mb-4">
          <Label className="text-foreground mb-1.5" nativeID="name-label">
            Device name
          </Label>
          <Input
            value={fields.name}
            onChangeText={(value) => change("name", value)}
            placeholder="e.g. Gaming PC"
            className="bg-card border-input text-foreground"
            accessibilityLabel="Device name"
            accessibilityLabelledBy="name-label"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => macInput.current?.focus()}
            aria-invalid={!!errors.name}
          />
          {errors.name ? (
            <Text
              accessibilityLiveRegion="polite"
              className="text-destructive text-sm mt-1"
            >
              {errors.name}
            </Text>
          ) : null}
        </View>
        <View className="mb-4">
          <Label className="text-foreground mb-1.5" nativeID="mac-label">
            MAC address
          </Label>
          <Input
            ref={macInput}
            value={fields.macAddress}
            onChangeText={(value) => change("macAddress", value)}
            onBlur={() => change("macAddress", normalizeMac(fields.macAddress))}
            placeholder="AA:BB:CC:DD:EE:FF"
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() =>
              advancedOpen && !selectedProfile
                ? ipInput.current?.focus()
                : handleAdd()
            }
            className="bg-card border-input text-foreground font-mono"
            accessibilityLabel="MAC address"
            accessibilityLabelledBy="mac-label"
            aria-invalid={!!errors.macAddress}
          />
          {errors.macAddress ? (
            <Text
              accessibilityLiveRegion="polite"
              className="text-destructive text-sm mt-1"
            >
              {errors.macAddress}
            </Text>
          ) : null}
        </View>
        <Button
          variant="ghost"
          className="justify-start px-0 mb-4"
          onPress={() => router.push("/help")}
        >
          <Text className="text-primary">
            Find your MAC address & setup help
          </Text>
        </Button>
        <Button
          variant="ghost"
          className="mb-2 justify-start px-0"
          accessibilityState={{ expanded: advancedOpen }}
          onPress={() => setAdvancedOpen(!advancedOpen)}
        >
          <Text className="text-primary">
            {advancedOpen ? "Hide Advanced" : "Advanced · broadcast settings"}
          </Text>
        </Button>
        {advancedOpen ? (
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">
              Network profile
            </Text>
            <View className="gap-2 mb-4">
              <Button
                variant={!selectedProfile ? "default" : "outline"}
                accessibilityState={{ selected: !selectedProfile }}
                onPress={() => setNetworkProfileId(undefined)}
              >
                <Text>Device-specific settings</Text>
              </Button>
              {profiles.map((profile) => (
                <Button
                  key={profile.id}
                  variant={
                    networkProfileId === profile.id ? "default" : "outline"
                  }
                  accessibilityState={{
                    selected: networkProfileId === profile.id,
                  }}
                  onPress={() => {
                    setNetworkProfileId(profile.id);
                    change("broadcastIp", profile.broadcastIp);
                  }}
                >
                  <Text>{profile.name}</Text>
                </Button>
              ))}
              <Text className="text-sm text-muted-foreground">
                Manage shared settings in Settings → Network profiles.
              </Text>
            </View>
            <Label className="text-foreground mb-1.5" nativeID="ip-label">
              Broadcast IP
            </Label>
            <Input
              ref={ipInput}
              editable={!selectedProfile}
              value={selectedProfile?.broadcastIp ?? fields.broadcastIp}
              onChangeText={(value) => change("broadcastIp", value)}
              placeholder="255.255.255.255"
              keyboardType={
                Platform.OS === "ios"
                  ? "numbers-and-punctuation"
                  : "decimal-pad"
              }
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
              className="bg-card border-input text-foreground font-mono"
              accessibilityLabel="Broadcast IP address"
              accessibilityLabelledBy="ip-label"
              aria-invalid={!!errors.broadcastIp}
            />
            {errors.broadcastIp ? (
              <Text
                accessibilityLiveRegion="polite"
                className="text-destructive text-sm mt-1"
              >
                {errors.broadcastIp}
              </Text>
            ) : null}
            <Text className="text-sm text-muted-foreground mt-2">
              The default sends to your local network. If it does not work, ask
              your network administrator for the subnet broadcast address. It
              depends on the subnet mask and does not always end in .255. Guest
              Wi-Fi or network isolation may block wake packets.
            </Text>
          </View>
        ) : (
          <Text className="text-sm text-muted-foreground mb-4">
            {selectedProfile
              ? selectedProfile.name + " broadcast: "
              : "Using local broadcast: "}
            {selectedProfile?.broadcastIp ?? fields.broadcastIp}
          </Text>
        )}
        <StatusTargetEditor draft={statusDraft} onChange={draft => { setStatusDraft(draft); setStatusError(''); }} error={statusError} />
      </View>
    </Screen>
  );
}
