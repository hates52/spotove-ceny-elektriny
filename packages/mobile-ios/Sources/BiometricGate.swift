import Foundation
import LocalAuthentication
import Security

enum BiometricGate {
    private static let service = "cz.spotove.ceny.biometric-gate"
    private static let account = "signed-in-session"

    static func enable() async throws {
        let context = LAContext()
        var evaluationError: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &evaluationError) else {
            throw evaluationError ?? BiometricError.unavailable
        }

        try await context.evaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            localizedReason: "Zapnout Face ID pro odemykání aplikace"
        )

        var accessControlError: Unmanaged<CFError>?
        guard let accessControl = SecAccessControlCreateWithFlags(
            nil,
            kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
            .biometryCurrentSet,
            &accessControlError
        ) else {
            throw accessControlError?.takeRetainedValue() ?? BiometricError.keychainFailure(errSecParam)
        }

        try deleteCredential()

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: Data("enabled".utf8),
            kSecAttrAccessControl as String: accessControl
        ]
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw BiometricError.keychainFailure(status)
        }
    }

    static func unlock() throws {
        let context = LAContext()
        context.localizedReason = "Odemknout Spotové ceny pomocí Face ID"

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: false,
            kSecMatchLimit as String: kSecMatchLimitOne,
            kSecUseAuthenticationContext as String: context
        ]

        let status = SecItemCopyMatching(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw BiometricError.keychainFailure(status)
        }
    }

    static func disable() throws {
        try deleteCredential()
    }

    private static func deleteCredential() throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw BiometricError.keychainFailure(status)
        }
    }
}

enum BiometricError: LocalizedError {
    case unavailable
    case keychainFailure(OSStatus)

    var errorDescription: String? {
        switch self {
        case .unavailable:
            return "Face ID není na tomto zařízení dostupné nebo není nastavené."
        case .keychainFailure(let status):
            if status == errSecUserCanceled || status == errSecAuthFailed {
                return "Odemknutí Face ID nebylo potvrzeno."
            }
            if status == errSecItemNotFound {
                return "Nastavení Face ID se změnilo. Přihlaste se znovu a Face ID znovu zapněte."
            }
            return "Face ID se nepodařilo bezpečně nastavit (Keychain \(status))."
        }
    }
}
