package expo.modules.wolsender

import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import android.widget.Toast

class WakeTileService : TileService() {
    private var busy = false

    override fun onStartListening() {
        super.onStartListening()
        render(if (busy) "Sending…" else "Tap to wake")
    }

    private fun render(status: String) {
        val name = QuickWakeActions.selectedName(this)
        qsTile?.apply {
            label = name?.let { "Wake ${it.take(24)}" } ?: "POWL Wake"
            state = if (busy) Tile.STATE_UNAVAILABLE else Tile.STATE_INACTIVE
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) subtitle = if (name == null) "Choose a device in POWL" else status
            contentDescription = "$label. $status"
            updateTile()
        }
    }

    override fun onClick() {
        super.onClick()
        if (busy) return
        if (isLocked) unlockAndRun { send() } else send()
    }

    private fun send() {
        if (busy) return
        busy = true
        render("Sending…")
        QuickWakeActions.wake(this, QuickWakeActions.selectedId(this)) { message ->
            busy = false
            render(message)
            Toast.makeText(applicationContext, message, Toast.LENGTH_LONG).show()
        }
    }
}
