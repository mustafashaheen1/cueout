import Capacitor
import AuthenticationServices
import CryptoKit
import Foundation

@objc(AppleAuthPlugin)
public class AppleAuthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleAuthPlugin"
    public let jsName = "AppleAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
    ]

    private var pendingCall: CAPPluginCall?
    private var currentNonce: String?

    @objc func signIn(_ call: CAPPluginCall) {
        pendingCall = call

        let nonce = randomNonceString()
        currentNonce = nonce

        DispatchQueue.main.async {
            let provider = ASAuthorizationAppleIDProvider()
            let request = provider.createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = self.sha256(nonce)

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private func randomNonceString(length: Int = 32) -> String {
        var randomBytes = [UInt8](repeating: 0, count: length)
        guard SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes) == errSecSuccess else {
            return UUID().uuidString.replacingOccurrences(of: "-", with: "")
        }
        return randomBytes.map { String(format: "%02x", $0) }.joined()
    }

    private func sha256(_ input: String) -> String {
        let hashed = SHA256.hash(data: Data(input.utf8))
        return hashed.map { String(format: "%02x", $0) }.joined()
    }
}

// ── ASAuthorizationControllerDelegate ────────────────────────────────────────

extension AppleAuthPlugin: ASAuthorizationControllerDelegate {
    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let tokenData = credential.identityToken,
            let identityToken = String(data: tokenData, encoding: .utf8),
            let nonce = currentNonce
        else {
            pendingCall?.reject("Failed to get Apple credentials")
            pendingCall = nil
            currentNonce = nil
            return
        }

        var result: [String: Any] = [
            "identityToken": identityToken,
            "nonce": nonce,
            "user": credential.user,
        ]

        // Apple only sends name/email on the FIRST sign-in for a given device.
        if let fullName = credential.fullName {
            var name: [String: String] = [:]
            if let given = fullName.givenName  { name["firstName"] = given }
            if let family = fullName.familyName { name["lastName"] = family }
            if !name.isEmpty { result["fullName"] = name }
        }
        if let email = credential.email {
            result["email"] = email
        }

        pendingCall?.resolve(result)
        pendingCall = nil
        currentNonce = nil
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        let code = (error as? ASAuthorizationError)?.code
        if code == .canceled {
            pendingCall?.reject("USER_CANCELLED")
        } else {
            pendingCall?.reject(error.localizedDescription)
        }
        pendingCall = nil
        currentNonce = nil
    }
}

// ── ASAuthorizationControllerPresentationContextProviding ─────────────────────

extension AppleAuthPlugin: ASAuthorizationControllerPresentationContextProviding {
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return bridge?.webView?.window ?? UIWindow()
    }
}
