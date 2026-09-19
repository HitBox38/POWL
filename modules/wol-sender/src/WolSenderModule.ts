import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

interface WolSenderNativeModule {
  sendMagicPacket(macAddress: string, broadcastIp: string): Promise<void>;
}

export default Platform.OS === 'android'
  ? requireOptionalNativeModule<WolSenderNativeModule>('WolSender')
  : null;
