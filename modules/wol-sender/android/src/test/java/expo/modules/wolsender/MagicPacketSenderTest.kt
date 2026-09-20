package expo.modules.wolsender

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class MagicPacketSenderTest {
    @Test fun buildsStandardMagicPacket() {
        val packet = MagicPacketSender.buildPacket("01:23:45:67:89:AB")
        assertEquals(102, packet.size)
        assertArrayEquals(ByteArray(6) { 0xFF.toByte() }, packet.copyOfRange(0, 6))
        val mac = byteArrayOf(0x01, 0x23, 0x45, 0x67, 0x89.toByte(), 0xAB.toByte())
        for (repeat in 1..16) assertArrayEquals(mac, packet.copyOfRange(repeat * 6, repeat * 6 + 6))
        assertArrayEquals(packet, MagicPacketSender.buildPacket("01-23-45-67-89-ab"))
    }

    @Test fun rejectsInvalidAddressesBeforeOpeningSocket() {
        assertThrows(IllegalArgumentException::class.java) { MagicPacketSender.buildPacket("GG:23:45:67:89:AB") }
        assertThrows(IllegalArgumentException::class.java) { MagicPacketSender.buildPacket("01:23:45") }
        for (destination in listOf("example.com", "256.1.2.3", "1.2.3", "1.2.3.-1")) {
            assertThrows(IllegalArgumentException::class.java) { MagicPacketSender.send("01:23:45:67:89:AB", destination) }
        }
    }
}
