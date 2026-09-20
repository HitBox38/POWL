package expo.modules.wolsender

import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress

internal object MagicPacketSender {
    fun send(macAddress: String, broadcastIp: String) {
        val packet = buildPacket(macAddress)
        val octets = broadcastIp.split('.')
        require(octets.size == 4 && octets.all { it.matches(Regex("[0-9]{1,3}")) && it.toInt() in 0..255 }) {
            "Expected an IPv4 broadcast address"
        }
        // Numeric bytes avoid a DNS lookup in the short-lived widget receiver.
        val address = InetAddress.getByAddress(octets.map { it.toInt().toByte() }.toByteArray())
        DatagramSocket().use { socket ->
            socket.broadcast = true
            socket.send(DatagramPacket(packet, packet.size, address, 9))
        }
    }

    fun buildPacket(mac: String): ByteArray {
        val hex = mac.replace(":", "").replace("-", "").uppercase()
        require(hex.matches(Regex("[0-9A-F]{12}"))) { "Expected a MAC address with 12 hexadecimal digits" }
        val bytes = ByteArray(6) { hex.substring(it * 2, it * 2 + 2).toInt(16).toByte() }
        return ByteArray(102) { index -> if (index < 6) 0xFF.toByte() else bytes[(index - 6) % 6] }
    }
}
