export type SendMagicPacketOptions = {
  /** MAC address of the target machine: "AA:BB:CC:DD:EE:FF" or "AA-BB-CC-DD-EE-FF" */
  macAddress: string;
  /**
   * UDP broadcast destination address.
   * - "255.255.255.255" — global broadcast (works across all subnets on device)
   * - "192.168.1.255"   — subnet-scoped broadcast (more reliable on some routers)
   * @default "255.255.255.255"
   */
  broadcastIp?: string;
};
