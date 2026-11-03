import Charts
import SwiftUI

struct PricesView: View {
    @ObservedObject private var authManager: AuthManager
    @StateObject private var viewModel: PricesViewModel
    @State private var isDatePickerPresented = false
    @State private var datePickerSelection = Date()
    @State private var displayedMonth = Date()
    @State private var focusedPriceMinute: Int?
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    init(authManager: AuthManager) {
        self.authManager = authManager
        _viewModel = StateObject(
            wrappedValue: PricesViewModel(
                apiClient: PriceAPIClient(accessTokenProvider: {
                    try await authManager.acquireAccessToken()
                })
            )
        )
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header
                    .padding(.horizontal)
                    .padding(.vertical, 8)

                Group {
                    if let errorMessage = viewModel.errorMessage, viewModel.days.isEmpty {
                        errorState(errorMessage)
                    } else if viewModel.isLoading && viewModel.days.isEmpty {
                        ProgressView("Načítám ceny…")
                    } else if viewModel.days.isEmpty {
                        ContentUnavailableView(
                            "Žádné ceny",
                            systemImage: "bolt.slash",
                            description: Text("Pro vybrané dny nejsou dostupná žádná data.")
                        )
                    } else {
                        pricesContent
                    }
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .task {
                await viewModel.load()
            }
            .sheet(isPresented: $isDatePickerPresented) {
                datePickerSheet
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
            }
        }
    }

    private var header: some View {
        HStack(spacing: 8) {
            Image("AppLogo")
                .resizable()
                .scaledToFit()
                .frame(
                    width: horizontalSizeClass == .compact ? 36 : 44,
                    height: horizontalSizeClass == .compact ? 36 : 44
                )
                .accessibilityHidden(true)

            Text("Spotové ceny")
                .font(.system(size: horizontalSizeClass == .compact ? 18 : 24, weight: .bold))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .layoutPriority(1)

            Spacer(minLength: 4)

            Button {
                Task { await viewModel.load() }
            } label: {
                Image(systemName: "arrow.clockwise")
                    .frame(width: 40, height: 40)
            }
            .disabled(viewModel.isLoading)
            .accessibilityLabel("Obnovit ceny")

            Menu {
                if authManager.biometricEnabled {
                    Button("Vypnout Face ID", systemImage: "faceid") {
                        authManager.disableBiometrics()
                    }
                } else {
                    Button("Zapnout Face ID", systemImage: "faceid") {
                        Task { await authManager.enableBiometrics() }
                    }
                }

                Button("Odhlásit se", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive) {
                    authManager.signOut()
                }
            } label: {
                Image(systemName: "person.crop.circle")
                    .frame(width: 40, height: 40)
            }
            .accessibilityLabel("Nastavení účtu")
        }
        .accessibilityElement(children: .contain)
    }

    private var pricesContent: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0, pinnedViews: [.sectionHeaders]) {
                Section {
                    VStack(alignment: .leading, spacing: 20) {
                        if let day = viewModel.selectedDay {
                            priceChart(for: day)
                            priceList(for: day)
                        } else {
                            ContentUnavailableView(
                                "Pro tento den nejsou ceny",
                                systemImage: "calendar.badge.exclamationmark",
                                description: Text("Zkuste vybrat jiný den, pro který jsou data dostupná.")
                            )
                        }

                        if let dataSourceName = viewModel.selectedDay?.dataSourceName {
                            Text("Zdroj dat: \(dataSourceName)")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.vertical)
                } header: {
                    VStack(alignment: .leading, spacing: 16) {
                        if let authError = authManager.errorMessage {
                            Label(authError, systemImage: "exclamationmark.triangle")
                                .font(.subheadline)
                                .foregroundStyle(.orange)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        if let errorMessage = viewModel.errorMessage {
                            Label(errorMessage, systemImage: "exclamationmark.triangle")
                                .font(.subheadline)
                                .foregroundStyle(.orange)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        if let snapshot = viewModel.currentPriceSnapshot {
                            currentPrice(snapshot)
                        }

                        daySelector
                    }
                    .padding(.horizontal)
                    .padding(.top, 12)
                    .padding(.bottom, 12)
                    .background(.background)
                    .contentShape(Rectangle())
                }
            }
        }
        .refreshable {
            await viewModel.load()
        }
    }

    private var daySelector: some View {
        HStack(spacing: 8) {
            ForEach(viewModel.days) { day in
                Button {
                    viewModel.selectDay(day)
                } label: {
                    Text(dayTitle(for: day))
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(viewModel.selectedDate == day.date ? .accentColor : .secondary)
            }

            Button {
                datePickerSelection = viewModel.selectedDateValue
                displayedMonth = startOfMonth(datePickerSelection)
                isDatePickerPresented = true
            } label: {
                Label {
                    Text(viewModel.selectedDay?.parsedDate?.formatted(.dateTime.day().month(.abbreviated)) ?? "Datum")
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                } icon: {
                    Image(systemName: "calendar")
                }
            }
            .buttonStyle(.bordered)
            .disabled(viewModel.availableDateRange == nil)
            .accessibilityLabel("Vybrat konkrétní den")
        }
    }

    private var datePickerSheet: some View {
        NavigationStack {
            VStack(spacing: 20) {
                HStack {
                    Button {
                        moveDisplayedMonth(by: -1)
                    } label: {
                        Image(systemName: "chevron.left")
                            .frame(width: 44, height: 44)
                    }
                    .disabled(!canMoveDisplayedMonth(by: -1))
                    .accessibilityLabel("Předchozí měsíc")

                    Spacer()

                    Text(displayedMonth.formatted(.dateTime.month(.wide).year()))
                        .font(.headline)
                        .accessibilityAddTraits(.isHeader)

                    Spacer()

                    Button {
                        moveDisplayedMonth(by: 1)
                    } label: {
                        Image(systemName: "chevron.right")
                            .frame(width: 44, height: 44)
                    }
                    .disabled(!canMoveDisplayedMonth(by: 1))
                    .accessibilityLabel("Další měsíc")
                }

                calendarGrid

                Label("Dny bez datových souborů nelze vybrat.", systemImage: "info.circle")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Spacer(minLength: 0)
            }
            .padding()
            .navigationTitle("Vybrat den")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Zrušit") {
                        isDatePickerPresented = false
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Zobrazit") {
                        isDatePickerPresented = false
                        Task { await viewModel.selectDate(datePickerSelection) }
                    }
                    .disabled(!isDateAvailable(datePickerSelection))
                }
            }
        }
    }

    private var calendarGrid: some View {
        let calendar = Calendar.current
        let weekdaySymbols = calendar.veryShortStandaloneWeekdaySymbols
        let cells = calendarMonthCells

        return LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 8) {
            ForEach(0..<7, id: \.self) { index in
                Text(weekdaySymbols[(calendar.firstWeekday - 1 + index) % 7])
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .accessibilityHidden(true)
            }

            ForEach(cells.indices, id: \.self) { index in
                if let date = cells[index] {
                    calendarDayButton(date)
                } else {
                    Color.clear
                        .frame(height: 40)
                        .accessibilityHidden(true)
                }
            }
        }
    }

    private var calendarMonthCells: [Date?] {
        let calendar = Calendar.current
        guard let monthInterval = calendar.dateInterval(of: .month, for: displayedMonth),
              let dayRange = calendar.range(of: .day, in: .month, for: displayedMonth) else {
            return []
        }

        let weekday = calendar.component(.weekday, from: monthInterval.start)
        let leadingDays = (weekday - calendar.firstWeekday + 7) % 7
        let dates = dayRange.compactMap { day in
            calendar.date(byAdding: .day, value: day - 1, to: monthInterval.start)
        }
        return Array(repeating: nil, count: leadingDays) + dates.map { Optional($0) }
    }

    private func calendarDayButton(_ date: Date) -> some View {
        let dateString = HourlyPriceDay.dateString(from: date)
        let isAvailable = viewModel.availableDates.contains(dateString)
        let isSelected = HourlyPriceDay.dateString(from: datePickerSelection) == dateString

        return Button {
            datePickerSelection = date
        } label: {
            Text(date, format: .dateTime.day())
                .font(.body.weight(isSelected ? .semibold : .regular))
                .foregroundStyle(dayForeground(isAvailable: isAvailable, isSelected: isSelected))
                .frame(maxWidth: .infinity)
                .frame(height: 40)
                .background {
                    if isSelected {
                        Circle().fill(Color.accentColor)
                    } else if isAvailable {
                        Circle().fill(Color.accentColor.opacity(0.12))
                    }
                }
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .disabled(!isAvailable)
        .accessibilityLabel(date.formatted(date: .complete, time: .omitted))
        .accessibilityHint(isAvailable ? "Dostupná data" : "Pro tento den nejsou data")
    }

    private func dayForeground(isAvailable: Bool, isSelected: Bool) -> Color {
        if isSelected {
            return .white
        }
        return isAvailable ? .primary : Color.primary.opacity(0.35)
    }

    private func isDateAvailable(_ date: Date) -> Bool {
        viewModel.availableDates.contains(HourlyPriceDay.dateString(from: date))
    }

    private func canMoveDisplayedMonth(by offset: Int) -> Bool {
        guard let range = viewModel.availableDateRange,
              let target = Calendar.current.date(byAdding: .month, value: offset, to: displayedMonth) else {
            return false
        }
        return startOfMonth(target) >= startOfMonth(range.lowerBound)
            && startOfMonth(target) <= startOfMonth(range.upperBound)
    }

    private func moveDisplayedMonth(by offset: Int) {
        guard canMoveDisplayedMonth(by: offset),
              let date = Calendar.current.date(byAdding: .month, value: offset, to: displayedMonth) else {
            return
        }
        displayedMonth = startOfMonth(date)
    }

    private func startOfMonth(_ date: Date) -> Date {
        Calendar.current.dateInterval(of: .month, for: date)?.start ?? date
    }

    private func currentPrice(_ snapshot: CurrentPriceSnapshot) -> some View {
        let entry = snapshot.entry
        let observedAt = snapshot.observedAt
        let priceColor = color(for: entry.level)

        return HStack(alignment: .center, spacing: 16) {
            VStack(alignment: .leading, spacing: 5) {
                Text("Aktuální cena")
                    .font(.headline)
                Text(observedAt, format: .dateTime.day().month(.wide))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 5) {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(entry.priceCZK, format: .number.precision(.fractionLength(0)))
                        .font(.title2.bold())
                        .monospacedDigit()
                    Text("Kč/MWh")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Text(entry.timeRangeLabel)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(priceColor.opacity(0.12), in: RoundedRectangle(cornerRadius: 16))
        .accessibilityElement(children: .combine)
    }

    private func priceChart(for day: HourlyPriceDay) -> some View {
        let focusedEntry = focusedPriceMinute.flatMap { minute in
            day.data.min {
                abs($0.minutesSinceMidnight - minute) < abs($1.minutesSinceMidnight - minute)
            }
        }

        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Kč/MWh")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(dayTitle(for: day))
                    .font(.headline)
            }

            Chart(day.data) { entry in
                LineMark(
                    x: .value("Čas", entry.minutesSinceMidnight),
                    y: .value("Cena", entry.priceCZK)
                )
                .interpolationMethod(.catmullRom)
                .lineStyle(StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.green, .orange, .red],
                        startPoint: .bottom,
                        endPoint: .top
                    )
                )

                if focusedEntry?.id == entry.id {
                    RuleMark(x: .value("Vybraný čas", entry.minutesSinceMidnight))
                        .foregroundStyle(color(for: entry.level).opacity(0.7))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                        .annotation(position: .top, spacing: 2) {
                            Text(entry.priceCZK, format: .number.precision(.fractionLength(0)))
                                .font(.caption2.weight(.semibold))
                                .monospacedDigit()
                        }
                        .annotation(position: .bottom, spacing: 2) {
                            Text(entry.timeLabel)
                                .font(.caption2)
                                .monospacedDigit()
                        }

                    PointMark(
                        x: .value("Čas", entry.minutesSinceMidnight),
                        y: .value("Cena", entry.priceCZK)
                    )
                    .foregroundStyle(color(for: entry.level))
                    .symbolSize(50)
                }
            }
            .chartXAxis {
                AxisMarks(values: [0, 360, 720, 1080, 1440]) { _ in
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisGridLine()
                    AxisValueLabel {
                        if let price = value.as(Double.self) {
                            Text(price, format: .number.precision(.fractionLength(0)))
                                .font(.caption2)
                                .monospacedDigit()
                                .frame(width: 44, alignment: .trailing)
                        }
                    }
                }
            }
            .chartYScale(domain: .automatic(includesZero: false))
            .chartXScale(domain: -120...1560)
            .chartXSelection(value: $focusedPriceMinute)
            .frame(height: 190)
            .padding()
            .background(.background, in: RoundedRectangle(cornerRadius: 16))
            .overlay {
                RoundedRectangle(cornerRadius: 16)
                    .stroke(.quaternary, lineWidth: 1)
            }
        }
    }

    private func priceList(for day: HourlyPriceDay) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Ceny po 15 minutách")
                .font(.headline)
                .padding(.bottom, 8)

            ForEach(day.data.sorted { $0.minutesSinceMidnight < $1.minutesSinceMidnight }) { entry in
                let isCurrentInterval = viewModel.currentPriceSnapshot.map {
                    HourlyPriceDay.dateString(from: $0.observedAt) == day.date
                        && $0.entry.id == entry.id
                } ?? false

                HStack {
                    Circle()
                        .fill(color(for: entry.level))
                        .frame(width: 8, height: 8)
                    Text(entry.timeLabel)
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(entry.priceCZK, format: .number.precision(.fractionLength(0)))
                        .monospacedDigit()
                    Text("Kč/MWh")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(width: 58, alignment: .trailing)
                }
                .font(.subheadline)
                .padding(.vertical, 8)
                .padding(.horizontal, 8)
                .background {
                    if isCurrentInterval {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(color(for: entry.level).opacity(0.14))
                    }
                }
                .accessibilityElement(children: .combine)
            }
        }
    }

    private func errorState(_ message: String) -> some View {
        ContentUnavailableView {
            Label("Ceny se nepodařilo načíst", systemImage: "wifi.exclamationmark")
        } description: {
            Text(message)
        } actions: {
            Button("Zkusit znovu") {
                Task { await viewModel.load() }
            }
            .buttonStyle(.borderedProminent)
        }
    }

    private func dayTitle(for day: HourlyPriceDay) -> String {
        guard let date = day.parsedDate else { return day.date }
        return date.formatted(.dateTime.weekday(.wide).day().month(.wide))
    }

    private func color(for level: String) -> Color {
        switch level.lowercased() {
        case "low":
            .green
        case "medium":
            .orange
        case "high":
            .red
        default:
            .blue
        }
    }
}
