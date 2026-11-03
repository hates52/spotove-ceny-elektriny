import Foundation

struct CurrentPriceSnapshot {
    let entry: HourlyPriceEntry
    let observedAt: Date
}

@MainActor
final class PricesViewModel: ObservableObject {
    @Published private(set) var days: [HourlyPriceDay] = []
    @Published private(set) var availableDates: [String] = []
    @Published private(set) var historicalDay: HourlyPriceDay?
    @Published private(set) var currentPriceSnapshot: CurrentPriceSnapshot?
    @Published private(set) var isLoading = false
    @Published private(set) var errorMessage: String?
    @Published private(set) var selectedDate: String?

    private let apiClient: PriceAPIClient
    private var reloadRequested = false
    private var requestedDate: String?

    init(apiClient: PriceAPIClient) {
        self.apiClient = apiClient
    }

    var selectedDay: HourlyPriceDay? {
        historicalDay ?? days.first { $0.date == selectedDate }
    }

    var latestAvailableDays: [HourlyPriceDay] {
        availableDates.suffix(2).compactMap { date in
            days.first { $0.date == date }
        }
    }

    var availableDateRange: ClosedRange<Date>? {
        guard let first = availableDates.first.flatMap({ HourlyPriceDay.date(from: $0) }),
              let last = availableDates.last.flatMap({ HourlyPriceDay.date(from: $0) }) else {
            return nil
        }
        return first...last
    }

    var selectedDateValue: Date {
        selectedDate.flatMap { HourlyPriceDay.date(from: $0) } ?? Date()
    }

    func selectDay(_ day: HourlyPriceDay) {
        requestedDate = nil
        selectedDate = day.date
        historicalDay = nil
        errorMessage = nil
    }

    func selectDate(_ date: Date) async {
        let dateString = HourlyPriceDay.dateString(from: date)
        requestedDate = dateString

        if let day = days.first(where: { $0.date == dateString }) {
            selectDay(day)
            return
        }

        guard availableDates.contains(dateString) else {
            selectedDate = dateString
            historicalDay = nil
            errorMessage = nil
            return
        }

        do {
            let day = try await apiClient.fetchHistoricalDay(date: dateString)
            guard requestedDate == dateString else { return }
            selectedDate = dateString
            historicalDay = day
            errorMessage = nil
        } catch {
            if requestedDate == dateString {
                errorMessage = error.localizedDescription
            }
        }
    }

    func load() async {
        if isLoading {
            reloadRequested = true
            return
        }

        isLoading = true
        defer { isLoading = false }

        var cancellationRetries = 0
        repeat {
            reloadRequested = false
            errorMessage = nil

            do {
                var refreshedDays = try await apiClient.fetchStoredDays()
                    .filter { !$0.data.isEmpty }
                    .sorted { $0.date < $1.date }
                let refreshedAt = Date()
                currentPriceSnapshot = Self.currentPriceSnapshot(in: refreshedDays, at: refreshedAt)
                availableDates = try await apiClient.fetchAvailableDates().sorted()
                let datesWithData = Set(availableDates)

                for date in availableDates.suffix(2) where !refreshedDays.contains(where: { $0.date == date }) {
                    if let day = try await apiClient.fetchHistoricalDay(date: date) {
                        refreshedDays.append(day)
                    }
                }
                days = refreshedDays.sorted { $0.date < $1.date }

                if selectedDate == nil {
                    selectedDate = HourlyPriceDay.dateString(from: refreshedAt)
                }

                if let selectedDate, datesWithData.contains(selectedDate) {
                    if !days.contains(where: { $0.date == selectedDate }) {
                        historicalDay = try await apiClient.fetchHistoricalDay(date: selectedDate)
                    } else {
                        historicalDay = nil
                    }
                } else {
                    historicalDay = nil
                }
                cancellationRetries = 0
            } catch {
                if isCancellation(error) {
                    if cancellationRetries < 2 {
                        cancellationRetries += 1
                        reloadRequested = true
                        continue
                    }
                    return
                } else {
                    errorMessage = error.localizedDescription
                }
            }
        } while reloadRequested && !Task.isCancelled
    }

    private static func currentPriceSnapshot(
        in days: [HourlyPriceDay],
        at date: Date
    ) -> CurrentPriceSnapshot? {
        let today = HourlyPriceDay.dateString(from: date)
        let currentMinutes = Calendar.current.dateComponents([.hour, .minute], from: date)
        let minutesSinceMidnight = (currentMinutes.hour ?? 0) * 60 + (currentMinutes.minute ?? 0)
        guard let entry = days
            .first(where: { $0.date == today })?
            .data
            .filter({ $0.minutesSinceMidnight <= minutesSinceMidnight })
            .max(by: { $0.minutesSinceMidnight < $1.minutesSinceMidnight }) else {
            return nil
        }

        return CurrentPriceSnapshot(entry: entry, observedAt: date)
    }

    private func isCancellation(_ error: Error) -> Bool {
        if error is CancellationError {
            return true
        }

        let error = error as NSError
        return (error.domain == NSURLErrorDomain && error.code == NSURLErrorCancelled)
            || (error.domain == NSCocoaErrorDomain && error.code == NSUserCancelledError)
    }
}
