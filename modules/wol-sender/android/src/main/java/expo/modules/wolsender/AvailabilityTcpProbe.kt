package expo.modules.wolsender

import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import java.util.concurrent.CancellationException

internal object AvailabilityTcpProbe {
    fun connect(address: InetAddress, port: Int, socket: Socket, cancelled: () -> Boolean): Boolean = socket.use {
        if (cancelled()) throw CancellationException("Probe cancelled")
        it.connect(InetSocketAddress(address, port), 3_000)
        true
    }
}
