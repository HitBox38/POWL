import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendMagicPacket } from "@/modules/wol-sender";
import { useNetworkProfilesStore } from "@/store/network-profiles";
import { getNetworkMismatch, resolveBroadcastIp } from "@/lib/network-profiles";
import type { StatusTarget } from "@/lib/availability";

export type WakeStatus = "idle" | "sending" | "success" | "error";
export const WAKE_HISTORY_LIMIT = 20;
export type DeviceGroup = { id: string; name: string };
export type GroupWakeResult = { sent: number; failed: number; skipped: number };

export type WakeRequest = {
  requestedAt: string;
  result: "sent" | "failed";
  macAddress: string;
  broadcastIp: string;
  error?: string;
};

export type Device = {
  id: string;
  name: string;
  macAddress: string;
  broadcastIp: string;
  networkProfileId?: string;
  statusTarget?: StatusTarget;
  isFavorite?: boolean;
  groupId?: string;
  /** Sending is transient; restart restores only the last completed result. */
  wakeStatus: WakeStatus;
  wakeError?: string;
  /** The last completed send attempt. This does not confirm the computer woke. */
  lastWakeRequest?: WakeRequest;
  wakeHistory?: WakeRequest[];
};

type DevicesState = {
  devices: Device[];
  groups: DeviceGroup[];
  addDevice: (
    device: Omit<
      Device,
      "id" | "wakeStatus" | "wakeError" | "lastWakeRequest" | "wakeHistory"
    >,
  ) => string;
  addDevices: (
    devices: Pick<Device, "name" | "macAddress" | "broadcastIp" | "statusTarget">[],
  ) => void;
  removeDevice: (id: string) => void;
  removeNetworkProfile: (id: string) => void;
  updateDevice: (
    id: string,
    updates: Partial<
      Pick<Device, "name" | "macAddress" | "broadcastIp" | "networkProfileId" | "statusTarget">
    >,
  ) => void;
  setWakeStatus: (id: string, status: WakeStatus, error?: string) => void;
  wakeDevice: (id: string) => Promise<WakeRequest | undefined>;
  clearWakeHistory: (id: string) => void;
  toggleFavorite: (id: string) => void;
  assignGroup: (deviceId: string, groupId?: string) => void;
  addGroup: (name: string) => boolean;
  renameGroup: (id: string, name: string) => boolean;
  removeGroup: (id: string) => void;
  wakeGroup: (id: string) => Promise<GroupWakeResult>;
};

export const useDevicesStore = create<DevicesState>()(
  persist(
    (set, get) => ({
      devices: [],
      groups: [],

      toggleFavorite: (id) =>
        set((state) => ({
          devices: state.devices.map((device) =>
            device.id === id
              ? { ...device, isFavorite: !device.isFavorite }
              : device,
          ),
        })),

      assignGroup: (deviceId, groupId) => {
        if (groupId && !get().groups.some((group) => group.id === groupId))
          return;
        set((state) => ({
          devices: state.devices.map((device) =>
            device.id === deviceId ? { ...device, groupId } : device,
          ),
        }));
      },

      addGroup: (name) => {
        const trimmedName = name.trim();
        if (
          !trimmedName ||
          trimmedName.length > 40 ||
          get().groups.some(
            (group) => group.name.toLowerCase() === trimmedName.toLowerCase(),
          )
        )
          return false;
        set((state) => ({
          groups: [
            ...state.groups,
            {
              id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
              name: trimmedName,
            },
          ],
        }));
        return true;
      },

      renameGroup: (id, name) => {
        const trimmedName = name.trim();
        if (
          !trimmedName ||
          trimmedName.length > 40 ||
          !get().groups.some((group) => group.id === id) ||
          get().groups.some(
            (group) =>
              group.id !== id &&
              group.name.toLowerCase() === trimmedName.toLowerCase(),
          )
        )
          return false;
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === id ? { ...group, name: trimmedName } : group,
          ),
        }));
        return true;
      },

      removeGroup: (id) =>
        set((state) => ({
          groups: state.groups.filter((group) => group.id !== id),
          devices: state.devices.map((device) =>
            device.groupId === id ? { ...device, groupId: undefined } : device,
          ),
        })),

      wakeGroup: async (id) => {
        if (!get().groups.some((group) => group.id === id))
          return { sent: 0, failed: 0, skipped: 0 };
        const members = get().devices.filter((device) => device.groupId === id);
        const results = await Promise.all(
          members.map((device) => get().wakeDevice(device.id)),
        );
        return {
          sent: results.filter((result) => result?.result === "sent").length,
          failed: results.filter((result) => result?.result === "failed")
            .length,
          skipped: results.filter((result) => !result).length,
        };
      },

      addDevice: (device) => {
        const id = Date.now() + "-" + Math.random().toString(36).slice(2);
        set((state) => ({
          devices: [...state.devices, { ...device, id, wakeStatus: "idle" }],
        }));
        return id;
      },

      addDevices: (devices) =>
        set((state) => ({
          devices: [
            ...state.devices,
            ...devices.map((device, index) => ({
              ...device,
              id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
              wakeStatus: "idle" as WakeStatus,
            })),
          ],
        })),

      removeNetworkProfile: (id) => {
        if (
          !useDevicesStore.persist.hasHydrated() ||
          !useNetworkProfilesStore.persist.hasHydrated()
        )
          return;
        const network = useNetworkProfilesStore.getState();
        const profile = network.profiles.find((item) => item.id === id);
        if (!profile) return;
        set((state) => ({
          devices: state.devices.map((device) =>
            device.networkProfileId === id
              ? {
                  ...device,
                  networkProfileId: undefined,
                  broadcastIp: profile.broadcastIp,
                }
              : device,
          ),
        }));
        network.removeProfile(id);
      },

      removeDevice: (id) =>
        set((state) => ({
          devices: state.devices.filter((d) => d.id !== id),
        })),

      updateDevice: (id, updates) =>
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === id ? { ...d, ...updates } : d,
          ),
        })),

      setWakeStatus: (id, status, error) =>
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === id ? { ...d, wakeStatus: status, wakeError: error } : d,
          ),
        })),

      wakeDevice: async (id) => {
        if (
          !useDevicesStore.persist.hasHydrated() ||
          !useNetworkProfilesStore.persist.hasHydrated()
        )
          return;
        const device = get().devices.find((item) => item.id === id);
        if (!device || device.wakeStatus === "sending") return;

        const network = useNetworkProfilesStore.getState();
        const mismatch = getNetworkMismatch(
          device,
          network.profiles,
          network.activeProfileId,
        );
        if (mismatch) return;

        const destination = {
          macAddress: device.macAddress,
          broadcastIp: resolveBroadcastIp(device, network.profiles),
        };
        const requestedAt = new Date().toISOString();
        get().setWakeStatus(id, "sending");

        let request: WakeRequest;
        try {
          await sendMagicPacket(destination);
          request = { ...destination, requestedAt, result: "sent" };
        } catch (error) {
          request = {
            ...destination,
            requestedAt,
            result: "failed",
            error: error instanceof Error ? error.message : String(error),
          };
        }

        // Finish even if the card scrolls off screen; removed devices stay removed.
        set((state) => ({
          devices: state.devices.map((item) =>
            item.id === id
              ? {
                  ...item,
                  wakeStatus: request.result === "sent" ? "success" : "error",
                  wakeError: request.error,
                  lastWakeRequest: request,
                  wakeHistory: [
                    request,
                    ...(item.wakeHistory ??
                      (item.lastWakeRequest ? [item.lastWakeRequest] : [])),
                  ].slice(0, WAKE_HISTORY_LIMIT),
                }
              : item,
          ),
        }));
        return request;
      },

      clearWakeHistory: (id) =>
        set((state) => ({
          devices: state.devices.map((item) =>
            item.id === id
              ? {
                  ...item,
                  wakeHistory: [],
                  lastWakeRequest: undefined,
                  wakeError: undefined,
                  wakeStatus:
                    item.wakeStatus === "sending" ? "sending" : "idle",
                }
              : item,
          ),
        })),
    }),
    {
      name: "powl-devices",
      storage: createJSONStorage(() => AsyncStorage),
      // A restart never restores an in-flight send. Keep the completed result.
      partialize: (state) => ({
        groups: state.groups,
        devices: state.devices.map(
          ({ wakeStatus: _ws, wakeError: _we, ...rest }) => ({
            ...rest,
            wakeStatus: (rest.lastWakeRequest?.result === "sent"
              ? "success"
              : rest.lastWakeRequest?.result === "failed"
                ? "error"
                : "idle") as WakeStatus,
            wakeError: rest.lastWakeRequest?.error,
          }),
        ),
      }),
    },
  ),
);
