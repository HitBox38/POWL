import createQrCode from 'qrcode-generator';

export type TransferDevice = { name: string; macAddress: string; broadcastIp: string };

const MAX_DEVICES = 100;
const MAX_TEXT_LENGTH = 100_000;

export function canonicalMac(value: string): string {
  const hex = value.replace(/[:.\-\s]/g, '').toUpperCase();
  if (!/^[0-9A-F]{12}$/.test(hex)) throw new Error('Each device needs a valid MAC address.');
  return hex.match(/.{2}/g)!.join(':');
}

function validateDevice(value: unknown): TransferDevice {
  if (!value || typeof value !== 'object') throw new Error('Each device must contain a name, MAC address, and broadcast IP.');
  const device = value as Record<string, unknown>;
  if (typeof device.name !== 'string' || !device.name.trim()) {
    throw new Error('Each device needs a nonempty name.');
  }
  if (typeof device.macAddress !== 'string' || typeof device.broadcastIp !== 'string') {
    throw new Error('Each device needs a MAC address and broadcast IP.');
  }
  const ip = device.broadcastIp.trim().split('.');
  if (ip.length !== 4 || ip.some(part => !/^\d{1,3}$/.test(part) || Number(part) > 255)) {
    throw new Error('Each device needs a valid IPv4 broadcast address.');
  }
  return { name: device.name.trim(), macAddress: canonicalMac(device.macAddress), broadcastIp: ip.map(Number).join('.') };
}

export function exportDevices(devices: TransferDevice[]): string {
  if (devices.length > MAX_DEVICES) throw new Error('Export up to 100 devices at a time.');
  const text = JSON.stringify({ app: 'POWL', version: 1, devices: devices.map(validateDevice) }, null, 2);
  if (text.length > MAX_TEXT_LENGTH) throw new Error('This backup is too large. Use a smaller batch or shorten very long device names.');
  return text;
}

export function parseDeviceTransfer(text: string): TransferDevice[] {
  if (text.length > MAX_TEXT_LENGTH) throw new Error('This backup is too large. Import up to 100 devices at a time.');
  let payload: unknown;
  try { payload = JSON.parse(text); } catch { throw new Error('Paste a complete POWL backup or scan a POWL device QR code.'); }
  if (!payload || typeof payload !== 'object') throw new Error('This is not a POWL backup.');
  const backup = payload as Record<string, unknown>;
  if (backup.app !== 'POWL' || backup.version !== 1 || !Array.isArray(backup.devices)) {
    throw new Error('This backup format is not supported. Use a version 1 POWL backup.');
  }
  if (!backup.devices.length || backup.devices.length > MAX_DEVICES) throw new Error('A backup must contain 1–100 devices.');
  const devices = backup.devices.map(validateDevice);
  const seen = new Set<string>();
  return devices.filter(device => {
    if (seen.has(device.macAddress)) return false;
    seen.add(device.macAddress);
    return true;
  });
}

export function planDeviceImport(incoming: TransferDevice[], existing: { macAddress: string }[]) {
  const known = new Set(existing.map(device => canonicalMac(device.macAddress)));
  const additions = incoming.filter(device => !known.has(device.macAddress));
  return { additions, skipped: incoming.length - additions.length };
}

export type DeviceBackupBatch = { start: number; end: number; text: string };

/** Split on both device count and the import size limit, preserving order and every name. */
export function createDeviceBackupBatches(devices: TransferDevice[]): DeviceBackupBatch[] {
  const batches: DeviceBackupBatch[] = [];
  let batch: TransferDevice[] = [];
  let text = '';
  let start = 0;
  for (let index = 0; index < devices.length; index += 1) {
    const device = validateDevice(devices[index]);
    // A single oversized device cannot be made importable by splitting the batch.
    const single = exportDevices([device]);
    if (batch.length === MAX_DEVICES) {
      batches.push({ start, end: index, text });
      batch = [];
      start = index;
    }
    if (!batch.length) {
      batch = [device];
      text = single;
      continue;
    }
    const candidate = JSON.stringify({ app: 'POWL', version: 1, devices: [...batch, device] }, null, 2);
    if (candidate.length > MAX_TEXT_LENGTH) {
      batches.push({ start, end: index, text });
      batch = [device];
      text = single;
      start = index;
    } else {
      batch.push(device);
      text = candidate;
    }
  }
  if (batch.length) batches.push({ start, end: devices.length, text });
  return batches;
}

export function createDeviceQr(device: TransferDevice): { image: string | null; error: string } {
  try {
    const code = createQrCode(0, 'M');
    // ASCII JSON escapes preserve non-Latin names with every QR reader.
    const payload = JSON.stringify(JSON.parse(exportDevices([device])))
      .replace(/[\u007f-\uffff]/g, char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'));
    code.addData(payload, 'Byte');
    code.make();
    return { image: code.createDataURL(6, 24), error: '' };
  } catch {
    return { image: null, error: 'This device could not fit in a QR code. Share its backup batch above, or shorten its name and try again.' };
  }
}
