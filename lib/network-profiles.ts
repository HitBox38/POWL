export type NetworkProfile = { id: string; name: string; broadcastIp: string };
export function resolveBroadcastIp(
  device: { broadcastIp: string; networkProfileId?: string },
  profiles: readonly NetworkProfile[],
): string {
  return profiles.find((profile) => profile.id === device.networkProfileId)?.broadcastIp ?? device.broadcastIp;
}
export function getNetworkMismatch(
  device: { networkProfileId?: string },
  profiles: readonly NetworkProfile[],
  activeProfileId: string | null,
): string | null {
  const target = profiles.find((profile) => profile.id === device.networkProfileId);
  if (!target) return null;
  if (!activeProfileId) return `This device uses ${target.name}. Select your current network profile before waking it.`;
  if (target.id === activeProfileId) return null;
  const current = profiles.find((profile) => profile.id === activeProfileId);
  return `This device uses ${target.name}; your selected network is ${current?.name ?? 'unknown'}. Connect to the correct network and update your selection.`;
}
