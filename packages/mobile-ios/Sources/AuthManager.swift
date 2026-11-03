import Combine
import Foundation
import LocalAuthentication
import MSAL
import UIKit

@MainActor
final class AuthManager: ObservableObject {
    @Published private(set) var isBootstrapping = true
    @Published private(set) var isSignedIn = false
    @Published private(set) var isLocked = false
    @Published private(set) var isAuthenticating = false
    @Published private(set) var biometricEnabled: Bool
    @Published private(set) var username: String?
    @Published var errorMessage: String?

    private static let biometricPreferenceKey = "biometricUnlockEnabled"
    private let apiClient: PriceAPIClient
    private let scopes: [String]
    private var application: MSALPublicClientApplication?
    private var account: MSALAccount?

    init(apiClient: PriceAPIClient = PriceAPIClient()) {
        self.apiClient = apiClient
        self.biometricEnabled = UserDefaults.standard.bool(forKey: Self.biometricPreferenceKey)
        self.scopes = (Bundle.main.object(forInfoDictionaryKey: "ENTRA_API_SCOPE") as? String)?
            .split(whereSeparator: \.isWhitespace)
            .map(String.init) ?? []

        do {
            let clientID = try Self.requiredConfigurationValue("ENTRA_CLIENT_ID")
            let authorityValue = try Self.requiredConfigurationValue("ENTRA_AUTHORITY")
            let redirectURI = try Self.requiredConfigurationValue("ENTRA_REDIRECT_URI")
            guard !scopes.isEmpty else {
                throw AuthError.missingConfiguration("ENTRA_API_SCOPE")
            }
            guard let authorityURL = URL(string: authorityValue) else {
                throw AuthError.invalidConfiguration("ENTRA_AUTHORITY")
            }

            let authority = try MSALAADAuthority(url: authorityURL)
            let configuration = MSALPublicClientApplicationConfig(
                clientId: clientID,
                redirectUri: redirectURI,
                authority: authority
            )
            application = try MSALPublicClientApplication(configuration: configuration)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func bootstrap() async {
        defer { isBootstrapping = false }
        guard let application else { return }

        do {
            let accounts = try application.allAccounts()
            guard let cachedAccount = accounts.first else {
                if biometricEnabled {
                    disableBiometrics()
                }
                return
            }

            account = cachedAccount
            username = cachedAccount.username

            if biometricEnabled {
                isLocked = true
            } else {
                try await validateCachedSession()
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signIn() async {
        guard let application else {
            if errorMessage == nil {
                errorMessage = "Nejdřív nastavte konfiguraci Microsoft Entra ID v Config/Info.plist."
            }
            return
        }

        guard let viewController = Self.presentationViewController() else {
            errorMessage = "Nepodařilo se otevřít přihlašovací okno. Zkuste to znovu."
            return
        }

        isAuthenticating = true
        errorMessage = nil
        defer { isAuthenticating = false }

        do {
            let webviewParameters = MSALWebviewParameters(authPresentationViewController: viewController)
            let parameters = MSALInteractiveTokenParameters(scopes: scopes, webviewParameters: webviewParameters)
            let result = try await acquireToken(application: application, parameters: parameters)
            try await apiClient.validateSession(accessToken: result.accessToken)

            account = result.account
            username = result.account.username
            isSignedIn = true
            isLocked = false
        } catch {
            isSignedIn = false
            errorMessage = error.localizedDescription
        }
    }

    func unlock() async {
        errorMessage = nil
        do {
            try BiometricGate.unlock()
        } catch {
            if let biometricError = error as? BiometricError,
               case .keychainFailure(errSecItemNotFound) = biometricError {
                disableBiometrics()
                isSignedIn = false
                isLocked = false
            } else {
                isLocked = true
            }
            errorMessage = error.localizedDescription
            return
        }

        isLocked = false
        do {
            try await validateCachedSession()
        } catch {
            isSignedIn = false
            errorMessage = error.localizedDescription
        }
    }

    func enableBiometrics() async {
        errorMessage = nil
        do {
            try await BiometricGate.enable()
            UserDefaults.standard.set(true, forKey: Self.biometricPreferenceKey)
            biometricEnabled = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func disableBiometrics() {
        do {
            try BiometricGate.disable()
        } catch {
            errorMessage = error.localizedDescription
        }
        UserDefaults.standard.set(false, forKey: Self.biometricPreferenceKey)
        biometricEnabled = false
        isLocked = false
    }

    func signOut() {
        errorMessage = nil
        if let application, let account {
            do {
                try application.remove(account)
            } catch {
                errorMessage = "Odhlášení z Entra ID se nezdařilo: \(error.localizedDescription)"
                return
            }
        }

        disableBiometrics()
        account = nil
        username = nil
        isSignedIn = false
    }

    func didEnterBackground() {
        guard biometricEnabled, isSignedIn, !isAuthenticating else { return }
        isLocked = true
    }

    func handleMSALResponse(_ url: URL) {
        _ = MSALPublicClientApplication.handleMSALResponse(url, sourceApplication: nil)
    }

    func acquireAccessToken() async throws -> String? {
        guard let application, let account else {
            throw AuthError.noCachedAccount
        }

        let parameters = MSALSilentTokenParameters(scopes: scopes, account: account)
        let result = try await acquireSilentToken(application: application, parameters: parameters)
        return result.accessToken
    }

    private func validateCachedSession() async throws {
        do {
            guard let accessToken = try await acquireAccessToken() else {
                throw AuthError.noCachedAccount
            }
            try await apiClient.validateSession(accessToken: accessToken)
            isSignedIn = true
            errorMessage = nil
        } catch {
            isSignedIn = false
            throw error
        }
    }

    private func acquireToken(
        application: MSALPublicClientApplication,
        parameters: MSALInteractiveTokenParameters
    ) async throws -> MSALResult {
        try await withCheckedThrowingContinuation { continuation in
            application.acquireToken(with: parameters) { result, error in
                if let result {
                    continuation.resume(returning: result)
                } else {
                    continuation.resume(throwing: error ?? AuthError.tokenAcquisitionFailed)
                }
            }
        }
    }

    private func acquireSilentToken(
        application: MSALPublicClientApplication,
        parameters: MSALSilentTokenParameters
    ) async throws -> MSALResult {
        try await withCheckedThrowingContinuation { continuation in
            application.acquireTokenSilent(with: parameters) { result, error in
                if let result {
                    continuation.resume(returning: result)
                } else {
                    continuation.resume(throwing: error ?? AuthError.tokenAcquisitionFailed)
                }
            }
        }
    }

    private static func requiredConfigurationValue(_ key: String) throws -> String {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String,
              !value.isEmpty,
              !value.hasPrefix("YOUR_") else {
            throw AuthError.missingConfiguration(key)
        }
        return value
    }

    private static func presentationViewController() -> UIViewController? {
        let scenes = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
        let windows = scenes.flatMap(\.windows)
        return windows.first(where: \.isKeyWindow)?.rootViewController
    }
}

private enum AuthError: LocalizedError {
    case missingConfiguration(String)
    case invalidConfiguration(String)
    case noCachedAccount
    case tokenAcquisitionFailed

    var errorDescription: String? {
        switch self {
        case .missingConfiguration(let key):
            return "V Config/Info.plist není nastavena hodnota \(key)."
        case .invalidConfiguration(let key):
            return "Hodnota \(key) v Config/Info.plist není platná."
        case .noCachedAccount:
            return "Přihlášená relace vypršela. Přihlaste se znovu přes Microsoft."
        case .tokenAcquisitionFailed:
            return "Microsoft Entra ID nevrátilo přístupový token."
        }
    }
}
