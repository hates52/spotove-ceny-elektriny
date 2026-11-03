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

    init(apiClient: PriceAPIClient) {
        self.apiClient = apiClient
    }

    var selectedDay: HourlyPriceDay? {
        historicalDay ?? days.first { $0.date == selectedDate }
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
        selectedDate = day.date
        historicalDay = nil
        errorMessage = nil
    }

    func selectDate(_ date: Date) async {
        let dateString = HourlyPriceDay.dateString(from: date)

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
        guard !isLoading else { return }

        errorMessage = nil
        isLoading = true
        defer { isLoading = false }

        do {
            historicalDay = try await apiClient.fetchHistoricalDay(date: dateString)
            selectedDate = dateString
        } catch {
            errorMessage = error.localizedDescription
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
                let refreshedDays = try await apiClient.fetchStoredDays()
                    .filter { !$0.data.isEmpty }
                    .sorted { $0.date < $1.date }
                let refreshedAt = Date()
                days = refreshedDays
                currentPriceSnapshot = Self.currentPriceSnapshot(in: refreshedDays, at: refreshedAt)
                if selectedDate == nil {
                    selectedDate = days.first?.date
                }
                availableDates = try await apiClient.fetchAvailableDates().sorted()
                let datesWithData = Set(availableDates)

                if let selectedDate, datesWithData.contains(selectedDate) {
                    if days.contains(where: { $0.date == selectedDate }) {
                        historicalDay = nil
                    } else {
                        historicalDay = try await apiClient.fetchHistoricalDay(date: selectedDate)
                    }
                } else {
                    selectedDate = days.first?.date
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
