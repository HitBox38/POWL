import type { Device } from "@/store/devices";

export function wakeStatusLabel(device: Device): string {
  if (device.wakeStatus === "sending") return "Sending…";
  if (!device.lastWakeRequest) return "No requests yet";
  const date = new Date(device.lastWakeRequest.requestedAt);
  const when =
    date.toLocaleDateString() === new Date().toLocaleDateString()
      ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : date.toLocaleDateString();
  return `${device.lastWakeRequest.result === "sent" ? "Request sent" : "Couldn’t send"} · ${when}`;
}
