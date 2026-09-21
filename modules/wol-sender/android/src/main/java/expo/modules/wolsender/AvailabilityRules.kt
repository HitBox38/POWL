package expo.modules.wolsender

internal object AvailabilityRules {
    val serviceTypes = setOf("_smb._tcp.", "_ssh._tcp.", "_rfb._tcp.", "_http._tcp.")
    fun ipv4(ip: String): ByteArray {
        val parts = ip.split('.')
        require(parts.size == 4 && parts.all { it.matches(Regex("[0-9]{1,3}")) && it.toInt() in 0..255 })
        val octets = parts.map { it.toInt() }
        require(octets[0] != 0 && octets[0] != 127 && octets[0] < 224)
        return octets.map { it.toByte() }.toByteArray()
    }
}
