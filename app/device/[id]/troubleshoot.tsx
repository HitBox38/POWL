import { TroubleshootSheet } from "@/components/troubleshoot-sheet";
import { useRouteDevice } from "@/hooks/use-route-device";
import { MissingRecord } from "@/components/screen";
export default function DeviceScreen() {
  const device = useRouteDevice();
  return device ? <TroubleshootSheet device={device} /> : <MissingRecord />;
}
