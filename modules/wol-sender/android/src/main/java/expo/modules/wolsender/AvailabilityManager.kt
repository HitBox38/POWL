package expo.modules.wolsender

import android.content.Context
import android.net.ConnectivityManager
import android.net.LinkProperties
import android.net.Network
import android.net.NetworkCapabilities
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.Promise
import java.net.Inet4Address
import java.net.InetAddress
import java.net.NetworkInterface
import java.net.Socket
import java.net.SocketTimeoutException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.atomic.AtomicBoolean

/** NSD ownership stays on the main looper; bounded probes use a dedicated four-thread pool. */
@Suppress("DEPRECATION")
internal class AvailabilityManager(private val context: Context, private val emit: (String, Map<String, Any>) -> Unit) {
    private val handler = Handler(Looper.getMainLooper())
    private val connectivity = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    private val nsd = context.getSystemService(Context.NSD_SERVICE) as NsdManager
    private val executor = Executors.newFixedThreadPool(4)
    private val sessions = mutableMapOf<String, Session>()
    private val probes = ConcurrentHashMap<String, Probe>()
    private var callback: ConnectivityManager.NetworkCallback? = null
    @Volatile private var network: Network? = null
    private var networkKey = ""
    private var multicast: WifiManager.MulticastLock? = null
    private var resolving: Resolution? = null
    private val resolveQueue = ArrayDeque<Resolution>()
    @Volatile private var closed = false

    private class Session(val id: String) {
        val listeners = mutableListOf<NsdManager.DiscoveryListener>()
        val found = mutableMapOf<String, NsdServiceInfo>()
        val resolved = mutableMapOf<String, Map<String, Any>>()
        var refresh: Runnable? = null
    }
    private class Resolution(val session: Session, val key: String, val info: NsdServiceInfo) {
        var listener: NsdManager.ResolveListener? = null
        var timeout: Runnable? = null
    }
    private class Probe(val promise: Promise) {
        val finished = AtomicBoolean(false)
        @Volatile var socket: Socket? = null
        @Volatile var future: Future<*>? = null
        fun finish(status: String, reason: String? = null) {
            if (finished.compareAndSet(false, true)) promise.resolve(
                if (reason == null) mapOf("status" to status) else mapOf("status" to status, "reason" to reason)
            )
        }
        fun cancel() {
            finish("unknown", "Status check cancelled.")
            try { socket?.close() } catch (_: Exception) {}
            future?.cancel(true)
        }
    }

    fun startNetwork() = handler.post {
        if (closed) return@post
        try {
            if (callback == null) {
                val listener = object : ConnectivityManager.NetworkCallback() {
                    override fun onAvailable(network: Network) { handler.post { publishNetwork() } }
                    override fun onLost(network: Network) { handler.post { publishNetwork() } }
                    override fun onCapabilitiesChanged(network: Network, caps: NetworkCapabilities) { handler.post { publishNetwork() } }
                    override fun onLinkPropertiesChanged(network: Network, properties: LinkProperties) { handler.post { publishNetwork() } }
                }
                connectivity.registerDefaultNetworkCallback(listener)
                callback = listener
            }
            publishNetwork(force = true)
        } catch (_: SecurityException) {
            emit("onAvailabilityNetwork", mapOf("key" to "permission", "available" to false, "reason" to "Local network access is blocked. Check Android permissions."))
        }
    }

    private fun publishNetwork(force: Boolean = false) {
        if (callback == null || closed) return
        val active = connectivity.activeNetwork
        val caps = active?.let { connectivity.getNetworkCapabilities(it) }
        val local = caps != null && !caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN) &&
            (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET))
        val selected = if (local) active else null
        val links = selected?.let { connectivity.getLinkProperties(it) }
        val key = if (selected == null) "unavailable" else "$selected:${links?.interfaceName}:${links?.linkAddresses}:${links?.routes}"
        if (!force && key == networkKey) return
        if (key != networkKey) {
            sessions.keys.toList().forEach { id ->
                discoveryError(id, "Network changed. Find your computer again.")
                stopDiscoveryInternal(id)
            }
            probes.keys.toList().forEach { cancelProbe(it) }
        }
        network = selected
        networkKey = key
        val state = mutableMapOf<String, Any>("key" to key, "available" to (selected != null))
        if (selected == null) state["reason"] = "Connect to a local Wi-Fi or Ethernet network. VPNs may need to be disconnected."
        emit("onAvailabilityNetwork", state)
    }

    fun stopNetwork() = handler.post { stopNetworkInternal() }
    private fun stopNetworkInternal() {
        callback?.let { try { connectivity.unregisterNetworkCallback(it) } catch (_: Exception) {} }
        callback = null
        network = null
        networkKey = ""
        sessions.keys.toList().forEach { stopDiscoveryInternal(it) }
        probes.keys.toList().forEach { cancelProbe(it) }
    }

    fun startDiscovery(id: String, types: List<String>) = handler.post {
        if (closed) return@post
        stopDiscoveryInternal(id)
        val selected = network
        if (selected == null) {
            discoveryError(id, "Connect to a local Wi-Fi or Ethernet network first.")
            return@post
        }
        if (types.isEmpty() || types.any { it !in AvailabilityRules.serviceTypes }) {
            discoveryError(id, "Unsupported discovery service.")
            return@post
        }
        val session = Session(id)
        sessions[id] = session
        try {
            if (multicast == null) {
                val wifi = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
                multicast = wifi.createMulticastLock("POWL availability").apply { setReferenceCounted(false); acquire() }
            }
            types.distinct().forEach { type ->
                val listener = object : NsdManager.DiscoveryListener {
                    override fun onDiscoveryStarted(type: String) {}
                    override fun onDiscoveryStopped(type: String) {}
                    override fun onStartDiscoveryFailed(type: String, code: Int) { handler.post {
                        if (sessions[id] === session) {
                            discoveryError(id, "Discovery is unavailable (code $code). Retry or enter an IP manually.")
                            stopDiscoveryInternal(id)
                        }
                    } }
                    override fun onStopDiscoveryFailed(type: String, code: Int) {}
                    override fun onServiceFound(info: NsdServiceInfo) { handler.post {
                        if (sessions[id] !== session) return@post
                        val key = serviceKey(info)
                        // Keep the existing instance for duplicate announcements; queued resolutions remain valid.
                        if (!session.found.containsKey(key)) session.found[key] = info
                        enqueue(session, key, session.found.getValue(key))
                    } }
                    override fun onServiceLost(info: NsdServiceInfo) { handler.post {
                        if (sessions[id] !== session) return@post
                        val key = serviceKey(info)
                        session.found.remove(key)
                        session.resolved.remove(key)?.let { emitDiscovery(session, "lost", it) }
                    } }
                }
                session.listeners.add(listener)
                if (Build.VERSION.SDK_INT >= 33) nsd.discoverServices(type, NsdManager.PROTOCOL_DNS_SD, selected, context.mainExecutor, listener)
                else nsd.discoverServices(type, NsdManager.PROTOCOL_DNS_SD, listener)
            }
            session.refresh = object : Runnable {
                override fun run() {
                    if (sessions[id] !== session) return
                    session.found.forEach { (key, info) -> enqueue(session, key, info) }
                    handler.postDelayed(this, 20_000)
                }
            }.also { handler.postDelayed(it, 20_000) }
        } catch (_: SecurityException) {
            discoveryError(id, "Local network discovery is blocked. Check Android permissions.")
            stopDiscoveryInternal(id)
        } catch (_: Exception) {
            discoveryError(id, "Discovery could not start. Retry or enter an IP manually.")
            stopDiscoveryInternal(id)
        }
    }

    private fun serviceKey(info: NsdServiceInfo) = "${info.serviceName}\u0000${info.serviceType.trimEnd('.')}"
    private fun enqueue(session: Session, key: String, info: NsdServiceInfo) {
        if (resolving?.let { it.session === session && it.key == key } == true || resolveQueue.any { it.session === session && it.key == key }) return
        resolveQueue.add(Resolution(session, key, info))
        resolveNext()
    }
    private fun resolveNext() {
        if (resolving != null) return
        val item = resolveQueue.removeFirstOrNull() ?: return
        if (sessions[item.session.id] !== item.session || item.session.found[item.key] !== item.info) { resolveNext(); return }
        resolving = item
        fun complete(info: NsdServiceInfo?) {
            if (resolving !== item) return
            item.timeout?.let { handler.removeCallbacks(it) }
            resolving = null
            if (sessions[item.session.id] === item.session && item.session.found[item.key] === item.info) {
                val host = if (Build.VERSION.SDK_INT >= 34) info?.hostAddresses?.firstOrNull { it is Inet4Address } else info?.host
                if (info != null && host is Inet4Address && info.port in 1..65535) {
                    val data = mapOf<String, Any>("name" to info.serviceName, "serviceType" to (info.serviceType.trimEnd('.') + "."), "ip" to host.hostAddress!!, "port" to info.port)
                    item.session.resolved[item.key] = data
                    emitDiscovery(item.session, "found", data)
                } else {
                    item.session.resolved.remove(item.key)?.let { emitDiscovery(item.session, "lost", it) }
                }
            }
            resolveNext()
        }
        val listener = object : NsdManager.ResolveListener {
            override fun onResolveFailed(info: NsdServiceInfo, code: Int) { handler.post { complete(null) } }
            override fun onServiceResolved(info: NsdServiceInfo) { handler.post { complete(info) } }
        }
        item.listener = listener
        item.timeout = Runnable {
            if (Build.VERSION.SDK_INT >= 34) try { nsd.stopServiceResolution(listener) } catch (_: Exception) {}
            complete(null)
        }.also { handler.postDelayed(it, 5_000) }
        try { nsd.resolveService(item.info, listener) } catch (_: Exception) { complete(null) }
    }

    fun stopDiscovery(id: String) = handler.post { stopDiscoveryInternal(id) }
    private fun stopDiscoveryInternal(id: String) {
        val session = sessions.remove(id) ?: return
        session.refresh?.let { handler.removeCallbacks(it) }
        session.listeners.forEach { try { nsd.stopServiceDiscovery(it) } catch (_: Exception) {} }
        resolveQueue.removeAll { it.session === session }
        resolving?.takeIf { it.session === session }?.let { item ->
            // Android <34 has no cancellation API; retain the single resolver slot until its bounded timeout.
            if (Build.VERSION.SDK_INT >= 34) {
                item.listener?.let { try { nsd.stopServiceResolution(it) } catch (_: Exception) {} }
                item.timeout?.let { handler.removeCallbacks(it) }
                resolving = null
                resolveNext()
            }
        }
        if (sessions.isEmpty()) { try { multicast?.release() } catch (_: Exception) {}; multicast = null }
    }
    private fun emitDiscovery(session: Session, kind: String, service: Map<String, Any>) = emit("onAvailabilityDiscovery", mapOf("sessionId" to session.id, "kind" to kind, "service" to service))
    private fun discoveryError(id: String, reason: String) = emit("onAvailabilityDiscovery", mapOf("sessionId" to id, "kind" to "error", "reason" to reason))

    fun probe(id: String, ip: String, port: Int?, promise: Promise) {
        val selected = network
        if (selected == null || closed) { promise.resolve(mapOf("status" to "unknown", "reason" to "Local network is unavailable.")); return }
        val task = Probe(promise)
        probes.put(id, task)?.cancel()
        task.future = executor.submit {
            try {
                val address = InetAddress.getByAddress(AvailabilityRules.ipv4(ip))
                require(port == null || port in 1..65535)
                if (task.finished.get()) return@submit
                val online = if (port != null) {
                    val socket = selected.socketFactory.createSocket()
                    task.socket = socket
                    AvailabilityTcpProbe.connect(address, port, socket) { task.finished.get() }
                } else {
                    val name = connectivity.getLinkProperties(selected)?.interfaceName
                    val iface = name?.let { NetworkInterface.getByName(it) }
                    if (iface == null) { task.finish("unknown", "Local network changed. Try again."); return@submit }
                    address.isReachable(iface, 0, 3_000)
                }
                task.finish(if (online) "online" else "unreachable", if (online) null else "No response. The computer may be asleep or its firewall may block checks.")
            } catch (_: SecurityException) {
                task.finish("unknown", "Local network access is blocked. Check Android permissions.")
            } catch (_: IllegalArgumentException) {
                task.finish("unknown", "Invalid status check address or port. Edit this device.")
            } catch (_: SocketTimeoutException) {
                task.finish("unreachable", "No response before the check timed out.")
            } catch (error: Exception) {
                val blocked = generateSequence<Throwable>(error) { it.cause }.any {
                    it is android.system.ErrnoException && (it.errno == android.system.OsConstants.EACCES || it.errno == android.system.OsConstants.EPERM)
                }
                task.finish(if (blocked || network != selected) "unknown" else "unreachable",
                    if (blocked) "Local network access is blocked. Check Android permissions." else "No response. Check the computer, service, and network.")
            } finally {
                try { task.socket?.close() } catch (_: Exception) {}
                probes.remove(id, task)
            }
        }
    }
    fun cancelProbe(id: String) { probes.remove(id)?.cancel() }
    fun close() = handler.post {
        closed = true
        stopNetworkInternal()
        resolving?.timeout?.let { handler.removeCallbacks(it) }
        resolving = null
        resolveQueue.clear()
        executor.shutdownNow()
    }
}
