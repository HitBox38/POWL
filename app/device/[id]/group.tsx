import { router } from "expo-router";
import { Screen, MissingRecord } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useRouteDevice } from "@/hooks/use-route-device";
import { useDevicesStore } from "@/store/devices";

export default function DeviceGroupScreen() {
  const device = useRouteDevice();
  const groups = useDevicesStore((state) => state.groups);
  if (!device) return <MissingRecord />;
  return (
    <Screen
      title="Choose group"
      subtitle={`${device.name} · Changes save immediately.`}
    >
      {[{ id: undefined, name: "No group" }, ...groups].map((group) => (
        <Button
          key={group.id ?? "none"}
          variant={device.groupId === group.id ? "secondary" : "outline"}
          accessibilityRole="radio"
          accessibilityState={{ checked: device.groupId === group.id }}
          onPress={() =>
            useDevicesStore.getState().assignGroup(device.id, group.id)
          }
        >
          <Text>
            {device.groupId === group.id ? "✓  " : ""}
            {group.name}
          </Text>
        </Button>
      ))}
      <Button variant="ghost" onPress={() => router.push("/groups")}>
        <Text className="text-primary">Manage groups</Text>
      </Button>
    </Screen>
  );
}
