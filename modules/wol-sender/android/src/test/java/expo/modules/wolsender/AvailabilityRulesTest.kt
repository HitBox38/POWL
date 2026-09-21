package expo.modules.wolsender

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Test

class AvailabilityRulesTest {
    @Test fun parsesNumericAddressesWithoutDns() {
        assertArrayEquals(byteArrayOf(192.toByte(), 168.toByte(), 1, 10), AvailabilityRules.ipv4("192.168.1.10"))
    }
    @Test fun rejectsNonDeviceAddresses() {
        for (ip in listOf("host.local", "127.0.0.1", "255.255.255.255", "224.1.2.3", "0.0.0.0", "1.2.3.999", "1.2.3")) {
            var rejected = false
            try { AvailabilityRules.ipv4(ip) } catch (_: IllegalArgumentException) { rejected = true }
            assertEquals(ip, true, rejected)
        }
    }
}
