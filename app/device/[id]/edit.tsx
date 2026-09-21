import { DeviceForm } from "@/components/add-device-sheet";
import { useRouteDevice } from "@/hooks/use-route-device";
import { MissingRecord } from "@/components/screen";
export default function EditDeviceScreen() {
  const device = useRouteDevice();
  return device ? (
    <DeviceForm key={device.id} device={device} />
  ) : (
    <MissingRecord />
  );
}
