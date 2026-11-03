import Foundation

struct HourlyPriceDay: Decodable, Identifiable {
    let date: String
    let data: [HourlyPriceEntry]
    let dataSource: String?

    var id: String { date }

    var dataSourceName: String? {
        switch dataSource?.lowercased() {
        case "ote":
            "OTE"
        case "spotovaelektrina":
            "Spotová elektřina"
        case .some(let source):
            source
        case nil:
            nil
        }
    }

    var parsedDate: Date? {
        Self.dateFormatter.date(from: date)
    }

    private enum CodingKeys: String, CodingKey {
        case date
        case data
        case dataSource = "data_source"
    }

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    static func dateString(from date: Date) -> String {
        dateFormatter.string(from: date)
    }

    static func date(from string: String) -> Date? {
        dateFormatter.date(from: string)
    }
}

struct HourlyPriceEntry: Decodable, Identifiable {
    let hour: Int
    let minute: Int
    let priceEur: Double
    let priceCZK: Double
    let level: String
    let levelNum: Int
    let levelNum96: Int

    var id: String { "\(hour)-\(minute)" }
    var minutesSinceMidnight: Int { hour * 60 + minute }

    var timeLabel: String {
        String(format: "%02d:%02d", hour, minute)
    }

    var timeRangeLabel: String {
        let endMinutes = (minutesSinceMidnight + 15) % (24 * 60)
        let endTime = String(format: "%02d:%02d", endMinutes / 60, endMinutes % 60)
        return "od \(timeLabel) do \(endTime)"
    }
}

struct TodayTomorrowPricesResponse: Decodable {
    let days: [HourlyPriceDay]
}

struct AvailableDatesResponse: Decodable {
    let dates: [String]
}

struct HistoricalPricesResponse: Decodable {
    let data: [HourlyPriceDay]
}
