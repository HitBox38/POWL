import { requireNativeModule } from 'expo-modules-core';

interface WolSenderNativeModule {
  sendMagicPacket(macAddress: string, broadcastIp: string): Promise<void>;
}

export default requireNativeModule<WolSenderNativeModule>('WolSender');
