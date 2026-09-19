package expo.modules.wolsender

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress

class WolSenderModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("WolSender")

        /**
         * Sends a Wake-on-LAN magic packet via UDP broadcast.
         *
         * @param macAddress  MAC address in format "AA:BB:CC:DD:EE:FF" or "AA-BB-CC-DD-EE-FF"
         * @param broadcastIp Broadcast address, e.g. "255.255.255.255" or "192.168.1.255"
         */
        AsyncFunction("sendMagicPacket") { macAddress: String, broadcastIp: String ->
            val macBytes = parseMacAddress(macAddress)
            val packet = buildMagicPacket(macBytes)

            DatagramSocket().use { socket ->
                socket.broadcast = true
                val address = InetAddress.getByName(broadcastIp)
                val datagramPacket = DatagramPacket(packet, packet.size, address, 9)
                socket.send(datagramPacket)
            }
        }
    }

    /**
     * Parses "AA:BB:CC:DD:EE:FF" or "AA-BB-CC-DD-EE-FF" into a ByteArray(6).
     * Throws IllegalArgumentException on invalid input — expo-modules-core automatically
     * converts this into a Promise rejection on the JS side.
     */
    private fun parseMacAddress(mac: String): ByteArray {
        val hex = mac.replace(":", "").replace("-", "").uppercase()
        require(hex.length == 12) {
            "Invalid MAC address '$mac': expected 12 hex digits (e.g. AA:BB:CC:DD:EE:FF)"
        }
        require(hex.all { it.isDigit() || it in 'A'..'F' }) {
            "Invalid MAC address '$mac': contains non-hex characters"
        }
        return ByteArray(6) { i ->
            hex.substring(i * 2, i * 2 + 2).toInt(16).toByte()
        }
    }

    /**
     * Builds a 102-byte WoL magic packet:
     * - 6 bytes of 0xFF
     * - Target MAC address repeated 16 times (96 bytes)
     */
    private fun buildMagicPacket(macBytes: ByteArray): ByteArray {
        val packet = ByteArray(102)
        // First 6 bytes: synchronization stream (all 0xFF)
        for (i in 0 until 6) {
            packet[i] = 0xFF.toByte()
        }
        // Remaining 96 bytes: MAC address repeated 16 times
        for (i in 1..16) {
            System.arraycopy(macBytes, 0, packet, i * 6, 6)
        }
        return packet
    }
}
