import Foundation

enum PriceAPIError: LocalizedError {
    case invalidBaseURL
    case invalidResponse
    case unauthorized
    case httpStatus(Int)

    var errorDescription: String? {
        switch self {
        case .invalidBaseURL:
            return "Adresa backendu není platná. Zkontrolujte API_BASE_URL v Config/Info.plist."
        case .invalidResponse:
            return "Server vrátil neplatnou odpověď."
        case .unauthorized:
            return "Přístup zamítnut. Přihlaste se znovu přes Microsoft Entra ID."
        case .httpStatus(let status):
            return "Načtení cen se nezdařilo (HTTP \(status))."
        }
    }
}

struct PriceAPIClient {
    typealias AccessTokenProvider = () async throws -> String?

    private let baseURL: URL?
    private let session: URLSession
    private let accessTokenProvider: AccessTokenProvider?

    init(
        baseURL: URL? = (Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String)
            .flatMap(URL.init(string:)),
        session: URLSession = .shared,
        accessTokenProvider: AccessTokenProvider? = nil
    ) {
        self.baseURL = baseURL
        self.session = session
        self.accessTokenProvider = accessTokenProvider
    }

    func fetchStoredDays() async throws -> [HourlyPriceDay] {
        let data = try await get(path: ["api", "price", "today-tomorrow"])
        return try JSONDecoder().decode(TodayTomorrowPricesResponse.self, from: data).days
    }

    func fetchAvailableDates() async throws -> [String] {
        let data = try await get(path: ["api", "price", "dates"])
        return try JSONDecoder().decode(AvailableDatesResponse.self, from: data).dates
    }

    func fetchHistoricalDay(date: String) async throws -> HourlyPriceDay? {
        var components = URLComponents()
        components.queryItems = [
            URLQueryItem(name: "startDate", value: date),
            URLQueryItem(name: "endDate", value: date)
        ]
        let data = try await get(path: ["api", "price", "historical"], queryItems: components.queryItems)
        return try JSONDecoder().decode(HistoricalPricesResponse.self, from: data)
            .data
            .first { $0.date == date && !$0.data.isEmpty }
    }

    private func get(path: [String], queryItems: [URLQueryItem]? = nil) async throws -> Data {
        guard let baseURL else {
            throw PriceAPIError.invalidBaseURL
        }

        let endpoint = path.reduce(baseURL) { $0.appending(path: $1) }
        var components = URLComponents(url: endpoint, resolvingAgainstBaseURL: false)
        components?.queryItems = queryItems
        guard let url = components?.url else {
            throw PriceAPIError.invalidResponse
        }

        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let accessToken = try await accessTokenProvider?() {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await session.data(for: request)
        guard let response = response as? HTTPURLResponse else {
            throw PriceAPIError.invalidResponse
        }

        switch response.statusCode {
        case 200..<300:
            return data
        case 401, 403:
            throw PriceAPIError.unauthorized
        default:
            throw PriceAPIError.httpStatus(response.statusCode)
        }
    }

    func validateSession(accessToken: String) async throws {
        guard let baseURL else {
            throw PriceAPIError.invalidBaseURL
        }

        let endpoint = baseURL
            .appending(path: "api")
            .appending(path: "auth")
            .appending(path: "me")
        var request = URLRequest(url: endpoint)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let (_, response) = try await session.data(for: request)
        guard let response = response as? HTTPURLResponse else {
            throw PriceAPIError.invalidResponse
        }

        switch response.statusCode {
        case 200..<300:
            return
        case 401, 403:
            throw PriceAPIError.unauthorized
        default:
            throw PriceAPIError.httpStatus(response.statusCode)
        }
    }
}
