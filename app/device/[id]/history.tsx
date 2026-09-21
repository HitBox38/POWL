import { WakeHistorySheet } from "@/components/wake-history-sheet";
import { useRouteDevice } from "@/hooks/use-route-device";
import { MissingRecord } from "@/components/screen";
export default function DeviceScreen() {
  const device = useRouteDevice();
  return device ? <WakeHistorySheet device={device} /> : <MissingRecord />;
}
