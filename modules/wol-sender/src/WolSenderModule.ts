import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

interface WolSenderNativeModule {
  sendMagicPacket(macAddress: string, broadcastIp: string): Promise<void>;
  syncWakeWidget?(id: string | null, name: string | null, macAddress: string | null, broadcastIp: string | null): Promise<void>;
  requestPinWakeWidget?(): Promise<boolean>;
}

export default Platform.OS === 'android'
  ? requireOptionalNativeModule<WolSenderNativeModule>('WolSender')
  : null;
