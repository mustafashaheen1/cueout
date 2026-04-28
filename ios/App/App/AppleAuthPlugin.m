#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(AppleAuthPlugin, "AppleAuth",
    CAP_PLUGIN_METHOD(signIn, CAPPluginReturnPromise);
)
