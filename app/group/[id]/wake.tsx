import { useLocalSearchParams } from "expo-router";
import { useDevicesStore } from "@/store/devices";
import { GroupWakeSheet } from "@/components/group-wake-sheet";
import { MissingRecord } from "@/components/screen";
export default function GroupWakeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useDevicesStore((state) =>
    state.groups.find((item) => item.id === id),
  );
  return group ? (
    <GroupWakeSheet key={id} group={group} />
  ) : (
    <MissingRecord kind="Group" />
  );
}
