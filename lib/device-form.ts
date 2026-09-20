export type DeviceFields = { name: string; macAddress: string; broadcastIp: string };
export type DeviceFieldErrors = Partial<Record<keyof DeviceFields, string>>;

/** Accept colon, hyphen, dotted and compact addresses, but never silently discard invalid input. */
export function normalizeMac(value: string): string {
  const trimmed = value.trim();
  if (!/^(?:[\da-f]{12}|(?:[\da-f]{2}:){5}[\da-f]{2}|(?:[\da-f]{2}-){5}[\da-f]{2}|(?:[\da-f]{4}\.){2}[\da-f]{4})$/i.test(trimmed)) return trimmed;
  return trimmed.replace(/[:.\-]/g, '').toUpperCase().match(/.{2}/g)!.join(':');
}

export function validateDeviceFields(
  fields: DeviceFields,
  devices: readonly { id: string; macAddress: string }[],
  editingId?: string,
): DeviceFieldErrors {
  const errors: DeviceFieldErrors = {};
  if (!fields.name.trim()) errors.name = 'Enter a name for this device.';
  const mac = normalizeMac(fields.macAddress);
  if (!/^([\dA-F]{2}:){5}[\dA-F]{2}$/.test(mac)) {
    errors.macAddress = 'Enter 12 hexadecimal digits, such as AA:BB:CC:DD:EE:FF.';
  } else if (devices.some((device) => device.id !== editingId && normalizeMac(device.macAddress) === mac)) {
    errors.macAddress = 'This MAC address is already saved. Open that device to edit it.';
  }
  const octets = fields.broadcastIp.trim().split('.');
  if (octets.length !== 4 || octets.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) {
    errors.broadcastIp = 'Enter a valid IPv4 address, such as 255.255.255.255.';
  }
  return errors;
}

export function normalizeDeviceFields(fields: DeviceFields): DeviceFields {
  return {
    name: fields.name.trim(),
    macAddress: normalizeMac(fields.macAddress),
    broadcastIp: fields.broadcastIp.trim().split('.').map(Number).join('.'),
  };
}
