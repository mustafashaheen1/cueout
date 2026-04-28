#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Registers the Swift plugin class with Capacitor's auto-discovery system.
// The string "IAPPlugin" must match the @objc(IAPPlugin) annotation in IAPPlugin.swift.
CAP_PLUGIN(IAPPlugin, "IAP",
    CAP_PLUGIN_METHOD(purchaseProduct, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(restorePurchases, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getActiveSubscription, CAPPluginReturnPromise);
)
