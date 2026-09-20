import { useMemo, useRef, useState } from 'react';
import { Image, Linking, Platform, Share, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useDevicesStore } from '@/store/devices';
import { useNetworkProfilesStore } from '@/store/network-profiles';
import { resolveBroadcastIp } from '@/lib/network-profiles';
import { createDeviceBackupBatches, createDeviceQr, parseDeviceTransfer, planDeviceImport, type TransferDevice } from '@/lib/device-transfer';

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function DeviceTransferSheet({ open, onOpenChange }: Props) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      {open ? <TransferContent /> : null}
    </DialogContent>
  </Dialog>;
}

function TransferContent() {
  const devices = useDevicesStore(state => state.devices);
  const profiles = useNetworkProfilesStore(state => state.profiles);
  const transferDevices = useMemo(() => devices.map(device => ({ ...device, broadcastIp: resolveBroadcastIp(device, profiles) })), [devices, profiles]);
  const [source, setSource] = useState('');
  const [preview, setPreview] = useState<TransferDevice[] | null>(null);
  const [notice, setNotice] = useState('');
  const [scanning, setScanning] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [batchIndex, setBatchIndex] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);
  const backup = useMemo(() => {
    try { return { batches: createDeviceBackupBatches(transferDevices), error: '' }; }
    catch (error) { return { batches: [], error: error instanceof Error ? error.message : 'Unable to export these devices.' }; }
  }, [transferDevices]);
  const selectedBatchIndex = Math.min(batchIndex, Math.max(backup.batches.length - 1, 0));
  const selectedBatch = backup.batches[selectedBatchIndex];
  const qr = useMemo(() => {
    const device = transferDevices.find(item => item.id === selectedId);
    return device ? createDeviceQr(device) : { image: null, error: '' };
  }, [transferDevices, selectedId]);
  const plan = preview ? planDeviceImport(preview, devices) : null;

  const inspect = (text: string) => {
    setNotice('');
    setPreview(null);
    try { setPreview(parseDeviceTransfer(text)); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to read this backup.'); }
  };
  const startScan = async () => {
    try {
      const result = permission?.granted ? permission : await requestPermission();
      if (!result.granted) {
        setNotice('Camera access is needed to scan a QR code. You can still paste a backup below.');
        return;
      }
      scanned.current = false;
      setScanning(true);
      setNotice('');
    } catch { setNotice('The camera is unavailable. Paste a backup below instead.'); }
  };
  const importPreview = () => {
    if (!preview) return;
    // Recheck against the latest store so a stale preview never creates duplicates.
    const current = useDevicesStore.getState();
    const result = planDeviceImport(preview, current.devices);
    current.addDevices(result.additions);
    setPreview(null);
    setSource('');
    setNotice(`Imported ${result.additions.length} device(s). ${result.skipped} existing device(s) left unchanged.`);
  };

  return <View className="gap-4">
    <DialogHeader><DialogTitle>Transfer devices</DialogTitle></DialogHeader>
    <Text className="text-sm text-muted-foreground">Back up device names and network addresses. Existing devices are kept; wake history is not transferred.</Text>
    <Text className="font-semibold">Export a backup</Text>
    {backup.error ? <Text accessibilityLiveRegion="polite" className="text-destructive">{backup.error}</Text> : null}
    {backup.batches.length > 1 ? <View className="gap-2">
      <Text className="text-sm text-muted-foreground">Your backup uses {backup.batches.length} batches. Share each batch, then import them one at a time on the other device. Each batch contains up to 100 devices.</Text>
      {backup.batches.map((batch, index) => <Button key={batch.start} variant={selectedBatchIndex === index ? 'secondary' : 'outline'} accessibilityState={{ selected: selectedBatchIndex === index }} onPress={() => setBatchIndex(index)}>
        <Text>Batch {index + 1}: devices {batch.start + 1}–{batch.end}</Text>
      </Button>)}
    </View> : null}
    {selectedBatch ? <Text accessibilityLiveRegion="polite" className="text-sm text-muted-foreground">Selected: devices {selectedBatch.start + 1}–{selectedBatch.end} of {devices.length} ({selectedBatch.end - selectedBatch.start} devices).</Text> : null}
    <Button disabled={!selectedBatch} onPress={async () => {
      if (!selectedBatch) return;
      try { await Share.share({ message: selectedBatch.text, title: backup.batches.length > 1 ? `POWL device backup — batch ${selectedBatchIndex + 1} of ${backup.batches.length}` : 'POWL device backup' }); }
      catch { setNotice('Sharing is unavailable here. Select and copy the backup text below.'); }
    }}><Text>{backup.batches.length > 1 ? `Share batch ${selectedBatchIndex + 1}` : 'Share backup'}</Text></Button>
    {selectedBatch ? <Input multiline editable={false} value={selectedBatch.text} accessibilityLabel={`Backup batch ${selectedBatchIndex + 1}, devices ${selectedBatch.start + 1} through ${selectedBatch.end}; select to copy`} className="min-h-24 max-h-40 font-mono text-xs" /> : !devices.length ? <Text className="text-sm text-muted-foreground">Add a device to create a backup.</Text> : null}
    <Text className="font-semibold">Show a device QR code</Text>
    <View className="gap-2">{devices.map(device => <Button key={device.id} variant={selectedId === device.id ? 'secondary' : 'outline'} accessibilityState={{ selected: selectedId === device.id }} onPress={() => setSelectedId(selectedId === device.id ? null : device.id)}><Text>{device.name}</Text></Button>)}</View>
    {qr.error ? <Text accessibilityLiveRegion="polite" className="text-destructive text-sm">{qr.error}</Text> : null}
    {qr.image ? <View className="items-center gap-2"><Image source={{ uri: qr.image }} style={{ width: 260, height: 260, maxWidth: '100%' }} resizeMode="contain" accessibilityLabel="POWL device transfer QR code" /><Text className="text-xs text-muted-foreground">Scan from Transfer devices on your other phone.</Text></View> : null}
    <Text className="font-semibold">Import devices</Text>
    <Button variant="outline" onPress={startScan}><Text>Scan a QR code</Text></Button>
    {permission && !permission.granted && !permission.canAskAgain && Platform.OS !== 'web' ? <Button variant="outline" onPress={() => Linking.openSettings()}><Text>Open camera settings</Text></Button> : null}
    {scanning ? <View className="gap-2">
      <CameraView style={{ height: 260 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onMountError={() => { setScanning(false); setNotice('Unable to open the camera. Paste a backup instead.'); }} onBarcodeScanned={({ data }) => {
        if (scanned.current) return;
        scanned.current = true;
        setScanning(false);
        setSource(data);
        inspect(data);
      }} />
      <Button variant="outline" onPress={() => setScanning(false)}><Text>Cancel scan</Text></Button>
    </View> : null}
    <Input multiline value={source} onChangeText={value => { setSource(value); setPreview(null); setNotice(''); }} placeholder="Paste your POWL backup here" accessibilityLabel="POWL backup to import" autoCapitalize="none" autoCorrect={false} className="min-h-28 max-h-48 font-mono text-sm" />
    <Button variant="outline" disabled={!source.trim()} onPress={() => inspect(source)}><Text>Preview import</Text></Button>
    {plan ? <View className="gap-2">
      <Text>{plan.additions.length} new device(s); {plan.skipped} already saved.</Text>
      {plan.additions.map(device => <Text key={device.macAddress} className="text-sm">{device.name} · {device.macAddress}</Text>)}
      <Button disabled={!plan.additions.length} onPress={importPreview}><Text>Import {plan.additions.length} devices</Text></Button>
    </View> : null}
    {notice ? <Text accessibilityLiveRegion="polite" className="text-sm">{notice}</Text> : null}
  </View>;
}


