package expo.modules.wolsender

import android.app.Activity
import android.os.Bundle
import android.widget.Toast

/** Launcher shortcuts enter here, including cold starts; no React bridge is required. */
class WakeShortcutActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Activity recreation must not repeat an already dispatched request.
        if (savedInstanceState != null) { finish(); return }
        QuickWakeActions.wake(this, intent.getStringExtra("deviceId"), favoriteOnly = true) { message ->
            Toast.makeText(applicationContext, message, Toast.LENGTH_LONG).show()
            finish()
        }
    }
}
