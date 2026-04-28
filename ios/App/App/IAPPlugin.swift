import Capacitor
import StoreKit

@objc(IAPPlugin)
public class IAPPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "IAPPlugin"
    public let jsName = "IAP"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "purchaseProduct",       returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases",      returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getActiveSubscription", returnType: CAPPluginReturnPromise),
    ]

    // ─── Purchase ─────────────────────────────────────────────────────────────
    @objc func purchaseProduct(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId"), !productId.isEmpty else {
            call.reject("productId is required")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product not found: \(productId)")
                    return
                }

                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    // jwsRepresentation lives on VerificationResult, not on Transaction
                    let jws = verification.jwsRepresentation
                    switch verification {
                    case .verified(let transaction):
                        await transaction.finish()
                        call.resolve([
                            "productId": transaction.productID,
                            "jwsRepresentation": jws,
                            "transactionId": transaction.id,
                            "isMock": false
                        ])
                    case .unverified:
                        call.reject("VERIFICATION_FAILED")
                    }
                case .userCancelled:
                    call.reject("USER_CANCELLED")
                case .pending:
                    call.reject("PURCHASE_PENDING")
                @unknown default:
                    call.reject("UNKNOWN_RESULT")
                }
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    // ─── Restore Purchases ────────────────────────────────────────────────────
    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            var restored: [[String: Any]] = []
            for await result in Transaction.currentEntitlements {
                // jwsRepresentation lives on VerificationResult, capture before unwrapping
                let jws = result.jwsRepresentation
                if case .verified(let transaction) = result {
                    restored.append([
                        "productId": transaction.productID,
                        "jwsRepresentation": jws,
                        "transactionId": transaction.id
                    ])
                }
            }
            call.resolve(["transactions": restored])
        }
    }

    // ─── Get Active Subscription ──────────────────────────────────────────────
    // Returns the first active (non-expired, non-revoked) subscription entitlement.
    @objc func getActiveSubscription(_ call: CAPPluginCall) {
        Task {
            for await result in Transaction.currentEntitlements {
                // jwsRepresentation lives on VerificationResult, capture before unwrapping
                let jws = result.jwsRepresentation
                if case .verified(let transaction) = result {
                    // Skip if revoked (refunded / family-sharing removed)
                    if transaction.revocationDate != nil { continue }

                    var payload: [String: Any] = [
                        "productId": transaction.productID,
                        "jwsRepresentation": jws,
                        "transactionId": transaction.id
                    ]
                    if let expDate = transaction.expirationDate {
                        payload["expirationDate"] = expDate.timeIntervalSince1970
                    }
                    call.resolve(payload)
                    return
                }
            }
            // No active subscription found
            call.resolve([:])
        }
    }
}
