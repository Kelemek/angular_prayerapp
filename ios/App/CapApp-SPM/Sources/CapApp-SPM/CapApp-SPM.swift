import Capacitor
import PreferencesPlugin
import PrinterPlugin
import PushNotificationsPlugin

public let isCapacitorApp = true

/// SPM static linking often misses `NSClassFromString("PreferencesPlugin")`, so Capacitor
/// answers JS with UNIMPLEMENTED and the callback never settles. Register instances directly.
public func registerCapacitorPlugins(on bridge: CAPBridgeProtocol) {
    bridge.registerPluginInstance(PreferencesPlugin())
    bridge.registerPluginInstance(PushNotificationsPlugin())
    bridge.registerPluginInstance(PrinterPlugin())
}
