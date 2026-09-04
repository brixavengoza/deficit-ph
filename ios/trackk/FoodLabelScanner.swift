import Foundation
import UIKit
import Vision
import VisionKit

#if canImport(FoundationModels)
import FoundationModels
#endif

@objc(FoodLabelScanner)
class FoodLabelScanner: NSObject {
  private var activeSession: AnyObject?

  @objc(scanNutritionLabel:rejecter:)
  func scanNutritionLabel(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard #available(iOS 16.0, *) else {
        reject("scanner_unavailable", "Nutrition label scanning requires iOS 16 or newer.", nil)
        return
      }

      guard self.activeSession == nil else {
        reject("scanner_busy", "A nutrition label scan is already running.", nil)
        return
      }

      guard let presenter = Self.topViewController() else {
        reject("missing_presenter", "Unable to open scanner.", nil)
        return
      }

      let session = FoodLabelScannerSession(
        resolve: resolve,
        reject: reject,
        onClear: { [weak self] in
          self?.activeSession = nil
        }
      )
      self.activeSession = session
      session.start(from: presenter)
    }
  }

  @objc(recognizeNutritionLabelImage:resolver:rejecter:)
  func recognizeNutritionLabelImage(
    _ imageUri: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      Self.performVisionTextRecognition(
        imageUri: imageUri,
        onError: { code, message, error in
          reject(code, message, error)
        },
        onText: { text in
          Task {
            do {
              let draft = try await Self.analyzeNutritionLabelText(text)
              resolve([
                "rawText": text,
                "draft": draft,
              ])
            } catch {
              // Apple Intelligence is an ENHANCEMENT tier (iOS 26 + eligible hardware).
              // The OCR text is already in hand — return it so JS can fall back to the
              // deterministic parser instead of failing the scan on most iPhones.
              resolve([
                "rawText": text,
                "generativeError": Self.appleIntelligenceErrorMessage(for: error),
              ])
            }
          }
        }
      )
    }
  }

  // Vision-only OCR (no generative parse). Fast enough to run repeatedly for the live
  // auto-detect loop; works on every iPhone this app supports.
  @objc(recognizeText:resolver:rejecter:)
  func recognizeText(
    _ imageUri: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      Self.performVisionTextRecognition(
        imageUri: imageUri,
        onError: { code, message, error in
          reject(code, message, error)
        },
        onText: { text in
          resolve(["rawText": text])
        }
      )
    }
  }

  private static func performVisionTextRecognition(
    imageUri: String,
    onError: @escaping (String, String, Error?) -> Void,
    onText: @escaping (String) -> Void
  ) {
    guard let image = loadImage(from: imageUri),
      let preparedImage = prepareImageForTextRecognition(image),
      let cgImage = preparedImage.cgImage
    else {
      onError("invalid_image", "Unable to read the selected nutrition label image.", nil)
      return
    }

    let request = VNRecognizeTextRequest { request, error in
      if let error {
        onError("text_recognition_failed", error.localizedDescription, error)
        return
      }

      let observations = request.results as? [VNRecognizedTextObservation] ?? []
      let text = combinedRecognizedText(from: observations)

      guard !text.isEmpty else {
        onError("no_text_found", "No nutrition label text was detected.", nil)
        return
      }

      onText(text)
    }

    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = false
    request.minimumTextHeight = 0.003

    do {
      try VNImageRequestHandler(
        cgImage: cgImage,
        orientation: cgImageOrientation(from: preparedImage.imageOrientation),
        options: [:]
      ).perform([request])
    } catch {
      onError("text_recognition_failed", error.localizedDescription, error)
    }
  }

  private static func loadImage(from imageUri: String) -> UIImage? {
    if let url = URL(string: imageUri), url.isFileURL {
      return UIImage(contentsOfFile: url.path)
    }

    return UIImage(contentsOfFile: imageUri)
  }

  private static func prepareImageForTextRecognition(_ image: UIImage) -> UIImage? {
    let longestSide = max(image.size.width, image.size.height)
    let scale = min(max(1, 2400 / max(longestSide, 1)), 4)
    let targetSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
    let renderer = UIGraphicsImageRenderer(size: targetSize)
    return renderer.image { _ in
      image.draw(in: CGRect(origin: .zero, size: targetSize))
    }
  }

  private static func cgImageOrientation(from imageOrientation: UIImage.Orientation) -> CGImagePropertyOrientation {
    switch imageOrientation {
    case .up:
      return .up
    case .upMirrored:
      return .upMirrored
    case .down:
      return .down
    case .downMirrored:
      return .downMirrored
    case .left:
      return .left
    case .leftMirrored:
      return .leftMirrored
    case .right:
      return .right
    case .rightMirrored:
      return .rightMirrored
    @unknown default:
      return .up
    }
  }

  private struct RecognizedTextBox {
    let text: String
    let boundingBox: CGRect
  }

  private static func combinedRecognizedText(from observations: [VNRecognizedTextObservation]) -> String {
    let grouped = groupRecognizedTextRows(from: observations)
    let raw = observations
      .compactMap { $0.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines) }
      .filter { !$0.isEmpty }
      .joined(separator: "\n")
      .trimmingCharacters(in: .whitespacesAndNewlines)

    if grouped.isEmpty { return raw }
    return grouped
  }

  private static func groupRecognizedTextRows(from observations: [VNRecognizedTextObservation]) -> String {
    let boxes = observations.compactMap { observation -> RecognizedTextBox? in
      guard let text = observation.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines),
        !text.isEmpty
      else {
        return nil
      }

      return RecognizedTextBox(text: text, boundingBox: observation.boundingBox)
    }

    var rows: [[RecognizedTextBox]] = []
    let sortedBoxes = boxes.sorted { lhs, rhs in
      let lhsCenterY = lhs.boundingBox.midY
      let rhsCenterY = rhs.boundingBox.midY
      if abs(lhsCenterY - rhsCenterY) > 0.02 {
        return lhsCenterY > rhsCenterY
      }
      return lhs.boundingBox.minX < rhs.boundingBox.minX
    }

    for box in sortedBoxes {
      if let rowIndex = rows.firstIndex(where: { row in
        guard let first = row.first else { return false }
        let rowTolerance = max(first.boundingBox.height, box.boundingBox.height) * 0.75
        return abs(first.boundingBox.midY - box.boundingBox.midY) <= max(rowTolerance, 0.008)
      }) {
        rows[rowIndex].append(box)
      } else {
        rows.append([box])
      }
    }

    return rows
      .map { row in
        row
          .sorted { $0.boundingBox.minX < $1.boundingBox.minX }
          .map(\.text)
          .joined(separator: " ")
      }
      .joined(separator: "\n")
      .trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private static func topViewController(
    _ rootViewController: UIViewController? = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first { $0.isKeyWindow }?
      .rootViewController
  ) -> UIViewController? {
    if let navigationController = rootViewController as? UINavigationController {
      return topViewController(navigationController.visibleViewController)
    }

    if let tabBarController = rootViewController as? UITabBarController {
      return topViewController(tabBarController.selectedViewController)
    }

    if let presented = rootViewController?.presentedViewController {
      return topViewController(presented)
    }

    return rootViewController
  }

  static func analyzeNutritionLabelText(_ rawText: String) async throws -> [String: Any] {
    #if canImport(FoundationModels)
    if #available(iOS 26.0, *) {
      let model = SystemLanguageModel.default
      switch model.availability {
      case .available:
        let compactText = compactNutritionLabelText(rawText)
        let instructions = """
        You extract nutrition facts from OCR text produced from a packaged food label.
        Return only values that belong to the food itself, not values for added milk,
        prepared servings, or percent daily value columns. Convert nutrition to per 100g
        using the serving size when the label gives per-serving values. Keep units exact:
        caloriesPer100g is kcal, sodiumMgPer100g is mg, all other nutrients are grams.
        If a value is missing, use 0 and lower confidence.
        """
        let session = LanguageModelSession(model: model, instructions: instructions)
        let prompt = """
        Analyze this nutrition label OCR text and produce a structured nutrition draft.

        OCR text:
        \(compactText)
        """
        let response = try await session.respond(to: prompt, generating: AppleNutritionLabelDraft.self)
        return response.content.dictionary

      case .unavailable(.appleIntelligenceNotEnabled):
        throw FoodLabelScannerError.appleIntelligenceUnavailable(
          "Apple Intelligence is not enabled. Please enable it in Settings to scan nutrition labels."
        )
      case .unavailable(.deviceNotEligible):
        throw FoodLabelScannerError.appleIntelligenceUnavailable(
          "This device is not eligible for Apple Intelligence, which is required for nutrition label analysis."
        )
      case .unavailable(.modelNotReady):
        throw FoodLabelScannerError.appleIntelligenceUnavailable(
          "Apple Intelligence is still preparing its on-device model. Try again after the model finishes downloading."
        )
      case .unavailable:
        throw FoodLabelScannerError.appleIntelligenceUnavailable(
          "Apple Intelligence is unavailable on this device right now."
        )
      }
    }
    #endif

    throw FoodLabelScannerError.appleIntelligenceUnavailable(
      "Nutrition label analysis requires Apple Intelligence with iOS 26 or newer."
    )
  }

  static func appleIntelligenceErrorMessage(for error: Error) -> String {
    let details = [
      error.localizedDescription,
      String(describing: error),
      (error as NSError).debugDescription,
    ].joined(separator: "\n")

    if details.localizedCaseInsensitiveContains("modelcatalog")
      || details.localizedCaseInsensitiveContains("UnifiedAssetFramework")
      || details.localizedCaseInsensitiveContains("underlying assets")
      || details.localizedCaseInsensitiveContains("asset")
      || details.localizedCaseInsensitiveContains("GenerationError error -1") {
      return "Apple Intelligence model assets are not ready on this device yet. Keep the device online, enable Apple Intelligence in Settings, and try again after the on-device model finishes downloading."
    }

    return error.localizedDescription
  }

  private static func compactNutritionLabelText(_ rawText: String) -> String {
    let maxCharacters = 6_000
    let maxLines = 90
    let keywords = [
      "nutrition",
      "serving",
      "calories",
      "energy",
      "fat",
      "saturated",
      "trans",
      "cholesterol",
      "sodium",
      "carbohydrate",
      "carb",
      "fiber",
      "fibre",
      "sugar",
      "protein",
      "per",
      "amount",
    ]
    var seen = Set<String>()
    var lines: [String] = []

    for rawLine in rawText.components(separatedBy: .newlines) {
      let line = rawLine
        .replacingOccurrences(of: "\t", with: " ")
        .split(separator: " ")
        .joined(separator: " ")
        .trimmingCharacters(in: .whitespacesAndNewlines)

      guard !line.isEmpty else { continue }

      let dedupeKey = line.lowercased()
      guard !seen.contains(dedupeKey) else { continue }
      seen.insert(dedupeKey)
      lines.append(String(line.prefix(180)))
    }

    if lines.joined(separator: "\n").count <= maxCharacters && lines.count <= maxLines {
      return lines.joined(separator: "\n")
    }

    let firstLines = Array(lines.prefix(12))
    let nutritionLines = lines.filter { line in
      let lowercased = line.lowercased()
      return keywords.contains { lowercased.contains($0) }
        || lowercased.contains(" g")
        || lowercased.contains("mg")
        || lowercased.contains("kcal")
      }

    var compacted: [String] = []
    var compactSeen = Set<String>()
    for line in firstLines + nutritionLines {
      let key = line.lowercased()
      guard !compactSeen.contains(key) else { continue }
      compactSeen.insert(key)
      compacted.append(line)
      let joined = compacted.joined(separator: "\n")
      if compacted.count >= maxLines || joined.count >= maxCharacters {
        return String(joined.prefix(maxCharacters))
      }
    }

    let joined = compacted.isEmpty ? lines.joined(separator: "\n") : compacted.joined(separator: "\n")
    return String(joined.prefix(maxCharacters))
  }
}

private enum FoodLabelScannerError: LocalizedError {
  case appleIntelligenceUnavailable(String)

  var errorDescription: String? {
    switch self {
    case let .appleIntelligenceUnavailable(message):
      return message
    }
  }
}

#if canImport(FoundationModels)
@available(iOS 26.0, *)
@Generable
private struct AppleNutritionLabelDraft {
  @Guide(description: "The food or product name from the label. Use Scanned Food if unknown.")
  let foodName: String

  @Guide(description: "The serving size exactly as shown, for example 29 g or 3/4 cup (29 g).")
  let servingSizeLabel: String

  @Guide(description: "Calories in kcal per 100 grams of the food.")
  let caloriesPer100g: Double

  @Guide(description: "Protein in grams per 100 grams of the food.")
  let proteinPer100g: Double

  @Guide(description: "Carbohydrates in grams per 100 grams of the food.")
  let carbsPer100g: Double

  @Guide(description: "Fat in grams per 100 grams of the food.")
  let fatsPer100g: Double

  @Guide(description: "Fiber in grams per 100 grams of the food.")
  let fiberPer100g: Double

  @Guide(description: "Sugar in grams per 100 grams of the food.")
  let sugarPer100g: Double

  @Guide(description: "Sodium in milligrams per 100 grams of the food.")
  let sodiumMgPer100g: Double

  @Guide(description: "Confidence from 0 to 1 based on OCR clarity and completeness.")
  let confidence: Double

  var dictionary: [String: Any] {
    [
      "foodName": foodName,
      "servingSizeLabel": servingSizeLabel,
      "caloriesPer100g": caloriesPer100g,
      "proteinPer100g": proteinPer100g,
      "carbsPer100g": carbsPer100g,
      "fatsPer100g": fatsPer100g,
      "fiberPer100g": fiberPer100g,
      "sugarPer100g": sugarPer100g,
      "sodiumMgPer100g": sodiumMgPer100g,
      "confidence": confidence,
    ]
  }
}
#endif

@available(iOS 16.0, *)
private final class FoodLabelScannerSession: NSObject, DataScannerViewControllerDelegate {
  private var scanner: DataScannerViewController?
  private let resolver: RCTPromiseResolveBlock
  private let rejecter: RCTPromiseRejectBlock
  private let onClear: () -> Void
  private var recognizedText = Set<String>()

  init(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
    onClear: @escaping () -> Void
  ) {
    self.resolver = resolve
    self.rejecter = reject
    self.onClear = onClear
  }

  func start(from presenter: UIViewController) {
    guard DataScannerViewController.isSupported else {
      rejecter("scanner_unavailable", "Live text scanning is not supported on this device.", nil)
      clear()
      return
    }

    guard DataScannerViewController.isAvailable else {
      rejecter("scanner_unavailable", "Live text scanning is not currently available.", nil)
      clear()
      return
    }

    let scanner = DataScannerViewController(
      recognizedDataTypes: [.text()],
      qualityLevel: .balanced,
      recognizesMultipleItems: true,
      isHighFrameRateTrackingEnabled: false,
      isHighlightingEnabled: true
    )
    scanner.delegate = self
    self.scanner = scanner

    let navController = UINavigationController(rootViewController: scanner)
    navController.setNavigationBarHidden(true, animated: false)
    navController.setToolbarHidden(false, animated: false)
    navController.toolbar.barStyle = .black
    navController.toolbar.isTranslucent = true
    scanner.setToolbarItems(
      [
        UIBarButtonItem(title: "Cancel", style: .plain, target: self, action: #selector(cancelScan)),
        UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil),
        UIBarButtonItem(title: "Capture", style: .done, target: self, action: #selector(finishScan)),
      ],
      animated: false
    )

    presenter.present(navController, animated: true) {
      do {
        try scanner.startScanning()
      } catch {
        navController.dismiss(animated: true)
        self.rejecter("scanner_failed", error.localizedDescription, error)
        self.clear()
      }
    }
  }

  func dataScanner(
    _ dataScanner: DataScannerViewController,
    didAdd addedItems: [RecognizedItem],
    allItems: [RecognizedItem]
  ) {
    collectText(from: allItems)
  }

  func dataScanner(
    _ dataScanner: DataScannerViewController,
    didUpdate updatedItems: [RecognizedItem],
    allItems: [RecognizedItem]
  ) {
    collectText(from: allItems)
  }

  private func collectText(from items: [RecognizedItem]) {
    for item in items {
      if case let .text(text) = item {
        recognizedText.insert(text.transcript)
      }
    }
  }

  @objc private func cancelScan() {
    scanner?.stopScanning()
    scanner?.navigationController?.dismiss(animated: true)
    rejecter("scanner_cancelled", "Scan cancelled.", nil)
    clear()
  }

  @objc private func finishScan() {
    scanner?.stopScanning()
    scanner?.navigationController?.dismiss(animated: true)

    let rawText = recognizedText
      .sorted()
      .joined(separator: "\n")
      .trimmingCharacters(in: .whitespacesAndNewlines)

    guard !rawText.isEmpty else {
      rejecter("no_text_found", "No nutrition label text was detected.", nil)
      clear()
      return
    }

    Task {
      do {
        let draft = try await FoodLabelScanner.analyzeNutritionLabelText(rawText)
        resolver([
          "rawText": rawText,
          "draft": draft,
        ])
      } catch {
        rejecter(
          "apple_intelligence_failed",
          FoodLabelScanner.appleIntelligenceErrorMessage(for: error),
          error
        )
      }
      clear()
    }
  }

  private func clear() {
    scanner = nil
    recognizedText.removeAll()
    onClear()
  }
}
