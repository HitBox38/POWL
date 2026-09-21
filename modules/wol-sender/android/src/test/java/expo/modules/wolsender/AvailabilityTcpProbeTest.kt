package expo.modules.wolsender

import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.SocketAddress
import java.net.SocketTimeoutException
import java.util.concurrent.CancellationException
import org.junit.Assert.*
import org.junit.Test

class AvailabilityTcpProbeTest {
    private val loopback = InetAddress.getByAddress(byteArrayOf(127, 0, 0, 1))

    @Test fun connectsToListeningEndpointAndClosesSocket() {
        ServerSocket(0, 1, loopback).use { server ->
            val socket = Socket()
            assertTrue(AvailabilityTcpProbe.connect(loopback, server.localPort, socket) { false })
            assertTrue(socket.isClosed)
        }
    }

    @Test fun timeoutIsBoundedAndClosesSocket() {
        var observedTimeout = 0
        val socket = object : Socket() {
            override fun connect(endpoint: SocketAddress?, timeout: Int) {
                observedTimeout = timeout
                throw SocketTimeoutException("test")
            }
        }
        try { AvailabilityTcpProbe.connect(loopback, 22, socket) { false }; fail("Expected timeout") }
        catch (_: SocketTimeoutException) {}
        assertEquals(3000, observedTimeout)
        assertTrue(socket.isClosed)
    }

    @Test fun cancellationDoesNotConnectAndClosesSocket() {
        var connected = false
        val socket = object : Socket() {
            override fun connect(endpoint: SocketAddress?, timeout: Int) { connected = true }
        }
        try { AvailabilityTcpProbe.connect(loopback, 22, socket) { true }; fail("Expected cancellation") }
        catch (_: CancellationException) {}
        assertFalse(connected)
        assertTrue(socket.isClosed)
    }
}
