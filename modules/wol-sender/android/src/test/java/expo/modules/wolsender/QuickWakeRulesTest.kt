package expo.modules.wolsender

import org.junit.Assert.*
import org.junit.Test

class QuickWakeRulesTest {
    @Test fun removedTargetsCannotSendEvenOnLocalNetworks() {
        assertNotNull(QuickWakeRules.blocker(false, null, true))
    }
    @Test fun wrongProfileAndNonLocalNetworksAreBlocked() {
        assertEquals("Choose Home", QuickWakeRules.blocker(true, "Choose Home", true))
        assertNotNull(QuickWakeRules.blocker(true, null, false))
        assertNull(QuickWakeRules.blocker(true, null, true))
    }
}
