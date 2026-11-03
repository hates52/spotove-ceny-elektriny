import SwiftUI

@main
struct SpotoveCenyApp: App {
    @StateObject private var authManager = AuthManager()

    var body: some Scene {
        WindowGroup {
            AuthRootView(authManager: authManager)
        }
    }
}
