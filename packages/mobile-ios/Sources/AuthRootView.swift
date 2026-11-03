import SwiftUI

struct AuthRootView: View {
    @ObservedObject var authManager: AuthManager
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        Group {
            if authManager.isBootstrapping {
                ProgressView("Kontroluji přihlášení…")
            } else if authManager.isLocked {
                lockedView
            } else if authManager.isSignedIn {
                PricesView(authManager: authManager)
            } else {
                signInView
            }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .background {
                authManager.didEnterBackground()
            }
        }
        .onOpenURL { url in
            authManager.handleMSALResponse(url)
        }
        .task {
            await authManager.bootstrap()
        }
    }

    private var signInView: some View {
        VStack(spacing: 20) {
            Text("Spotové ceny")
                .font(.largeTitle.bold())

            Text("Přihlaste se pracovním nebo školním účtem Microsoft.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)

            if let errorMessage = authManager.errorMessage {
                Text(errorMessage)
                    .font(.callout)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }

            Button {
                Task { await authManager.signIn() }
            } label: {
                HStack {
                    if authManager.isAuthenticating {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "person.crop.circle")
                    }
                    Text(authManager.isAuthenticating ? "Přihlašuji…" : "Přihlásit přes Microsoft")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(authManager.isAuthenticating)
        }
        .padding(32)
    }

    private var lockedView: some View {
        VStack(spacing: 20) {
            Text("Aplikace je zamčená")
                .font(.title2.bold())

            if let username = authManager.username {
                Text(username)
                    .foregroundStyle(.secondary)
            }

            if let errorMessage = authManager.errorMessage {
                Text(errorMessage)
                    .font(.callout)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }

            Button("Odemknout pomocí Face ID") {
                Task { await authManager.unlock() }
            }
            .buttonStyle(.borderedProminent)

            Button("Použít přihlášení Microsoft") {
                authManager.disableBiometrics()
                Task { await authManager.signIn() }
            }
            .buttonStyle(.borderless)
        }
        .padding(32)
    }
}
