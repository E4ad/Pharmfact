// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::io::{BufWriter, Cursor};
use std::time::Duration;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{path::BaseDirectory, Manager};

// ============================================================================
// Constantes
// ============================================================================

const APP_DATA_DIR: &str = "Pharmfact";
const STATE_FILE: &str = "app-state.json";
const OPQ_PHARMACIST_INDEX_URL: &str =
    "https://www.opq.org/wp-content/uploads/pharmacist-search/pharmacists_index.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GeocodeSuggestion {
    display_name: String,
    address_line: String,
    city: String,
    province: String,
    postcode: String,
    country_code: String,
    road: String,
    house_number: String,
    lat: Option<f64>,
    lng: Option<f64>,
    source: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RouteDistanceInput {
    from_lat: f64,
    from_lng: f64,
    to_lat: f64,
    to_lng: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RouteDistanceResult {
    distance_km: i64,
    distance_aller_km: i64,
    source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OpqPharmacistRegistryEntry {
    id: String,
    full_name: String,
    license_number: Option<String>,
    student_license_number: Option<String>,
    city: Option<String>,
    is_student: bool,
}

fn normalize_geocode_text(value: &str) -> String {
    value.trim().to_lowercase()
}

fn json_f64_value(item: &Value, key: &str) -> Option<f64> {
    item.get(key).and_then(|value| {
        value
            .as_f64()
            .or_else(|| value.as_str().and_then(|text| text.parse::<f64>().ok()))
    })
}

fn is_quebec_geocode_suggestion(suggestion: &GeocodeSuggestion) -> bool {
    let province = normalize_geocode_text(&suggestion.province);
    let country_code = normalize_geocode_text(&suggestion.country_code);
    let display_name = normalize_geocode_text(&suggestion.display_name);
    let city = normalize_geocode_text(&suggestion.city);
    (country_code.is_empty() || country_code == "ca")
        && (
            province.contains("québec")
                || province.contains("quebec")
                || display_name.contains("québec")
                || display_name.contains("quebec")
                || city.contains("québec")
                || city.contains("quebec")
        )
        && suggestion.lat.is_some()
        && suggestion.lng.is_some()
}

fn geocode_suggestion_from_value(item: &Value, source: &str) -> Option<GeocodeSuggestion> {
    let address = item.get("address").and_then(|value| value.as_object());
    let lat = json_f64_value(item, "lat").or_else(|| json_f64_value(item, "latitude"));
    let lng = json_f64_value(item, "lon")
        .or_else(|| json_f64_value(item, "lng"))
        .or_else(|| json_f64_value(item, "longitude"));

    let road = item
        .get("street")
        .and_then(|value| value.as_str())
        .or_else(|| item.get("road").and_then(|value| value.as_str()))
        .or_else(|| address.and_then(|value| value.get("road").and_then(|value| value.as_str())))
        .or_else(|| address.and_then(|value| value.get("pedestrian").and_then(|value| value.as_str())))
        .unwrap_or("")
        .trim()
        .to_string();
    let house_number = item
        .get("housenumber")
        .and_then(|value| value.as_str())
        .or_else(|| item.get("house_number").and_then(|value| value.as_str()))
        .or_else(|| address.and_then(|value| value.get("house_number").and_then(|value| value.as_str())))
        .unwrap_or("")
        .trim()
        .to_string();
    let display_name = item
        .get("formatted")
        .and_then(|value| value.as_str())
        .or_else(|| item.get("display_name").and_then(|value| value.as_str()))
        .or_else(|| item.get("label").and_then(|value| value.as_str()))
        .or_else(|| item.get("address_line1").and_then(|value| value.as_str()))
        .map(|value| value.trim().to_string())
        .unwrap_or_default();
    let address_line = item
        .get("address_line1")
        .and_then(|value| value.as_str())
        .or_else(|| item.get("addressLine").and_then(|value| value.as_str()))
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| {
            let parts = [house_number.as_str(), road.as_str()]
                .into_iter()
                .filter(|part| !part.is_empty())
                .collect::<Vec<_>>();
            if parts.is_empty() {
                display_name.clone()
            } else {
                parts.join(" ")
            }
        });
    let city = item
        .get("city")
        .and_then(|value| value.as_str())
        .or_else(|| address.and_then(|value| value.get("city").and_then(|value| value.as_str())))
        .or_else(|| address.and_then(|value| value.get("town").and_then(|value| value.as_str())))
        .or_else(|| address.and_then(|value| value.get("village").and_then(|value| value.as_str())))
        .or_else(|| address.and_then(|value| value.get("municipality").and_then(|value| value.as_str())))
        .unwrap_or("")
        .trim()
        .to_string();
    let province = item
        .get("state")
        .and_then(|value| value.as_str())
        .or_else(|| item.get("province").and_then(|value| value.as_str()))
        .or_else(|| address.and_then(|value| value.get("state").and_then(|value| value.as_str())))
        .unwrap_or("")
        .trim()
        .to_string();
    let postcode = item
        .get("postcode")
        .and_then(|value| value.as_str())
        .or_else(|| address.and_then(|value| value.get("postcode").and_then(|value| value.as_str())))
        .unwrap_or("")
        .trim()
        .to_string();
    let country_code = item
        .get("country_code")
        .and_then(|value| value.as_str())
        .or_else(|| item.get("countryCode").and_then(|value| value.as_str()))
        .or_else(|| address.and_then(|value| value.get("country_code").and_then(|value| value.as_str())))
        .unwrap_or("")
        .trim()
        .to_string();

    let suggestion = GeocodeSuggestion {
        display_name: if display_name.is_empty() {
            address_line.clone()
        } else {
            display_name
        },
        address_line,
        city,
        province,
        postcode,
        country_code,
        road,
        house_number,
        lat,
        lng,
        source: source.to_string(),
    };

    if is_quebec_geocode_suggestion(&suggestion) {
        Some(suggestion)
    } else {
        None
    }
}

async fn search_addresses_nominatim(query: &str) -> Result<Vec<GeocodeSuggestion>, String> {
    let endpoint = std::env::var("GEOCODE_ENDPOINT")
        .unwrap_or_else(|_| "https://nominatim.openstreetmap.org/search".to_string());
    let user_agent = std::env::var("GEOCODE_USER_AGENT")
        .unwrap_or_else(|_| "Pharmfact/1.0 contact:local".to_string());
    let client = Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|error| format!("Client HTTP géocodage invalide: {}", error))?;
    let country_codes = std::env::var("GEOCODE_COUNTRYCODES").unwrap_or_else(|_| "ca".to_string());
    let language = std::env::var("GEOCODE_LANGUAGE").unwrap_or_else(|_| "fr".to_string());
    let query_text = format!("{query}, Québec, Canada");
    let params = vec![
        ("format".to_string(), "jsonv2".to_string()),
        ("addressdetails".to_string(), "1".to_string()),
        ("limit".to_string(), "6".to_string()),
        ("countrycodes".to_string(), country_codes),
        ("accept-language".to_string(), language),
        ("q".to_string(), query_text),
    ];

    let response = client
        .get(endpoint)
        .header("User-Agent", user_agent)
        .query(&params)
        .send()
        .await
        .map_err(|error| format!("Nominatim inaccessible: {}", error))?;

    if !response.status().is_success() {
        return Err(format!("Nominatim a répondu {}", response.status()));
    }

    let payload: Value = response
        .json()
        .await
        .map_err(|error| format!("Nominatim a renvoyé un JSON invalide: {}", error))?;
    let results = payload.as_array().cloned().unwrap_or_default();

    let suggestions = results
        .iter()
        .filter_map(|item| geocode_suggestion_from_value(item, "nominatim"))
        .take(6)
        .collect::<Vec<_>>();

    log::info!("[OSM] Géocodage: {} résultat(s)", suggestions.len());
    Ok(suggestions)
}

#[tauri::command]
async fn geocode_address(query: String) -> Result<Vec<GeocodeSuggestion>, String> {
    let query = query.trim().to_string();
    if query.chars().count() < 3 {
        return Ok(vec![]);
    }

    match search_addresses_nominatim(&query).await {
        Ok(results) => Ok(results),
        Err(error) => {
            log::warn!("[OSM] Géocodage indisponible: {}", error);
            Ok(vec![])
        }
    }
}

fn route_distance_from_payload(payload: &Value) -> Option<RouteDistanceResult> {
    let meters = payload
        .get("routes")
        .and_then(|value| value.as_array())
        .and_then(|routes| routes.first())
        .and_then(|route| route.get("distance"))
        .and_then(|value| value.as_f64())?;

    if !meters.is_finite() || meters <= 0.0 {
        return None;
    }

    let distance_aller_km = ((meters / 1000.0).round() as i64).max(1);
    Some(RouteDistanceResult {
        distance_km: distance_aller_km * 2,
        distance_aller_km,
        source: "route".to_string(),
    })
}

#[tauri::command]
async fn route_distance(input: RouteDistanceInput) -> Result<Option<RouteDistanceResult>, String> {
    let endpoint = std::env::var("ROUTE_DISTANCE_ENDPOINT")
        .unwrap_or_else(|_| "https://router.project-osrm.org/route/v1/driving".to_string());
    let client = Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .map_err(|error| format!("Client HTTP distance invalide: {}", error))?;
    let url = format!(
        "{}/{},{};{},{}",
        endpoint.trim_end_matches('/'),
        input.from_lng,
        input.from_lat,
        input.to_lng,
        input.to_lat
    );

    let response = client
        .get(url)
        .query(&[("overview", "false")])
        .header("Accept", "application/json")
        .header("User-Agent", "Pharmfact/1.0 contact:local")
        .send()
        .await
        .map_err(|error| format!("Distance routière inaccessible: {}", error))?;

    if !response.status().is_success() {
        log::warn!("[OSM] Distance routière indisponible: {}", response.status());
        return Ok(None);
    }

    let payload: Value = response
        .json()
        .await
        .map_err(|error| format!("Distance routière JSON invalide: {}", error))?;
    let result = route_distance_from_payload(&payload);
    if let Some(distance) = &result {
        log::info!("[OSM] Distance routière: {} km aller-retour", distance.distance_km);
    }
    Ok(result)
}

#[tauri::command]
async fn fetch_opq_pharmacist_registry() -> Result<Vec<OpqPharmacistRegistryEntry>, String> {
    let endpoint = std::env::var("OPQ_PHARMACIST_INDEX_URL")
        .unwrap_or_else(|_| OPQ_PHARMACIST_INDEX_URL.to_string());
    let user_agent = std::env::var("OPQ_USER_AGENT")
        .unwrap_or_else(|_| "Pharmfact/1.0 contact:local".to_string());
    let client = Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|error| format!("Client HTTP OPQ invalide: {}", error))?;

    let response = client
        .get(endpoint)
        .header("Accept", "application/json")
        .header("User-Agent", user_agent)
        .send()
        .await
        .map_err(|error| format!("Référentiel OPQ inaccessible: {}", error))?;

    if !response.status().is_success() {
        return Err(format!("Référentiel OPQ indisponible: {}", response.status()));
    }

    let entries: Vec<OpqPharmacistRegistryEntry> = response
        .json()
        .await
        .map_err(|error| format!("Référentiel OPQ JSON invalide: {}", error))?;

    log::info!("[OPQ] Référentiel pharmaciens: {} entrée(s)", entries.len());
    Ok(entries)
}

// ============================================================================
// Commandes de stockage
// ============================================================================

#[tauri::command]
async fn load_state(app: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app
        .path()
        .resolve("", BaseDirectory::AppData)
        .map_err(|e| format!("Erreur résolution chemin: {}", e))?;

    let data_dir = app_dir.join(APP_DATA_DIR);
    fs::create_dir_all(&data_dir).map_err(|e| format!("Erreur création répertoire: {}", e))?;

    let state_path = data_dir.join(STATE_FILE);

    if !state_path.exists() {
        return Ok("{}".to_string());
    }

    fs::read_to_string(&state_path).map_err(|e| format!("Erreur de lecture: {}", e))
}

#[tauri::command]
async fn save_state(state: String, app: tauri::AppHandle) -> Result<(), String> {
    let app_dir = app
        .path()
        .resolve("", BaseDirectory::AppData)
        .map_err(|e| format!("Erreur résolution chemin: {}", e))?;

    let data_dir = app_dir.join(APP_DATA_DIR);
    fs::create_dir_all(&data_dir).map_err(|e| format!("Erreur création répertoire: {}", e))?;

    let state_path = data_dir.join(STATE_FILE);
    fs::write(&state_path, state).map_err(|e| format!("Erreur d'écriture: {}", e))
}

#[tauri::command]
async fn export_state(app: tauri::AppHandle) -> Result<String, String> {
    load_state(app).await
}

#[tauri::command]
async fn import_state(json: String, app: tauri::AppHandle) -> Result<(), String> {
    save_state(json, app).await
}

#[tauri::command]
async fn clear_state(app: tauri::AppHandle) -> Result<(), String> {
    let app_dir = app
        .path()
        .resolve("", BaseDirectory::AppData)
        .map_err(|e| format!("Erreur résolution chemin: {}", e))?;

    let data_dir = app_dir.join(APP_DATA_DIR);
    let state_path = data_dir.join(STATE_FILE);

    if state_path.exists() {
        fs::remove_file(&state_path).map_err(|e| format!("Erreur de suppression: {}", e))?;
    }
    Ok(())
}

// ============================================================================
// Commandes de fichiers
// ============================================================================

#[tauri::command]
async fn download_file(
    filename: String,
    _mime_type: String,
    data: Vec<u8>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let app_dir = app
        .path()
        .resolve("", BaseDirectory::AppData)
        .map_err(|e| format!("Erreur résolution chemin: {}", e))?;

    let download_dir = app_dir.join(APP_DATA_DIR).join("Downloads");
    fs::create_dir_all(&download_dir).map_err(|e| format!("Erreur création répertoire: {}", e))?;

    let file_path = download_dir.join(&filename);
    fs::write(&file_path, &data).map_err(|e| format!("Erreur d'écriture: {}", e))?;

    Ok(())
}

// Note: open_file et show_confirm_dialog sont gérés côté frontend avec @tauri-apps/api"

#[tauri::command]
async fn read_file_text(path: String, _app: tauri::AppHandle) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Erreur de lecture: {}", e))
}

// ============================================================================
// Commande de génération PDF
// ============================================================================

fn json_str<'a>(value: &'a serde_json::Value, key: &str) -> &'a str {
    value.get(key).and_then(|v| v.as_str()).unwrap_or("")
}

fn json_i64(value: &serde_json::Value, key: &str) -> i64 {
    value.get(key).and_then(|v| v.as_i64()).unwrap_or(0)
}

fn json_f64(value: &serde_json::Value, key: &str) -> f64 {
    value.get(key).and_then(|v| v.as_f64()).unwrap_or(0.0)
}

fn find_by_id<'a>(
    state: &'a serde_json::Value,
    collection: &str,
    id: &str,
) -> Option<&'a serde_json::Value> {
    state
        .get(collection)?
        .as_array()?
        .iter()
        .find(|item| json_str(item, "id") == id)
}

fn format_decimal(value: f64, decimals: usize) -> String {
    format!("{:.*}", decimals, value).replace('.', ",")
}

fn format_money_cents(cents: i64) -> String {
    format!("{:.2} $", cents as f64 / 100.0).replace('.', ",")
}

fn money(cents: i64) -> String {
    format_money_cents(cents)
}

fn format_hours(hours: f64) -> String {
    format!("{} h", format_decimal(hours, 2))
}

fn format_km(km: f64) -> String {
    format!("{} km", format_decimal(km, 1))
}

fn format_rate_cents_per_km(cents: i64) -> String {
    format!("{} / km", money(cents))
}

fn format_rate_cents(cents: i64) -> String {
    format_rate_cents_per_km(cents)
}

fn status_label(status: &str) -> &'static str {
    match status {
        "PAID" => "PAYÉE",
        "ARCHIVED" => "ARCHIVÉE",
        "VOIDED" => "ANNULÉE",
        "SENT" => "ENVOYÉE",
        _ => "À PAYER",
    }
}

fn expense_type_label(expense: &serde_json::Value) -> &'static str {
    match json_str(expense, "typeKey") {
        "MEAL" => "Repas",
        "MILEAGE" => "Kilométrage",
        "PARKING" => "Stationnement",
        "TOLL" => "Péage",
        "LODGING" => "Hébergement",
        "TRANSPORT" => "Transport",
        "SUPPLIES" => "Fourniture",
        _ => "Autre",
    }
}

fn travel_lines(mission: Option<&serde_json::Value>, billed_mileage_cents: i64) -> Vec<String> {
    if let Some(mission) = mission {
        let km = json_f64(mission, "mileageKm");
        if km > 0.0 {
            let mut lines = vec![
                format!("{} aller-retour", format_km(km)),
                format_rate_cents_per_km(json_i64(mission, "mileageRateCents")),
            ];
            if billed_mileage_cents > 0 {
                lines.push(money(billed_mileage_cents));
            } else {
                lines.push("Distance indicative — non facturé".to_string());
            }
            return lines;
        }
    }

    vec!["Aucun déplacement facturé".to_string()]
}

fn truncate_chars(value: &str, max_chars: usize) -> String {
    let mut chars = value.chars();
    let truncated: String = chars.by_ref().take(max_chars).collect();
    if chars.next().is_some() {
        format!("{}...", truncated)
    } else {
        truncated
    }
}

fn pdf_color(r: f64, g: f64, b: f64) -> printpdf::Color {
    printpdf::Color::Rgb(printpdf::Rgb::new(r, g, b, None))
}

fn draw_rect(
    layer: &printpdf::PdfLayerReference,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    fill: (f64, f64, f64),
    stroke: Option<(f64, f64, f64)>,
) {
    use printpdf::{Line, Mm, Point};

    let mut rect = Line {
        points: vec![
            (Point::new(Mm(x), Mm(y)), false),
            (Point::new(Mm(x + width), Mm(y)), false),
            (Point::new(Mm(x + width), Mm(y - height)), false),
            (Point::new(Mm(x), Mm(y - height)), false),
        ],
        is_closed: true,
        has_fill: true,
        has_stroke: stroke.is_some(),
        is_clipping_path: false,
    };
    rect.set_fill(true);
    rect.set_stroke(stroke.is_some());
    layer.set_fill_color(pdf_color(fill.0, fill.1, fill.2));
    if let Some((r, g, b)) = stroke {
        layer.set_outline_color(pdf_color(r, g, b));
        layer.set_outline_thickness(0.4);
    }
    layer.add_shape(rect);
}

fn draw_line(
    layer: &printpdf::PdfLayerReference,
    x1: f64,
    y1: f64,
    x2: f64,
    y2: f64,
    color: (f64, f64, f64),
    thickness: f64,
) {
    use printpdf::{Line, Mm, Point};

    let line = Line {
        points: vec![
            (Point::new(Mm(x1), Mm(y1)), false),
            (Point::new(Mm(x2), Mm(y2)), false),
        ],
        is_closed: false,
        has_fill: false,
        has_stroke: true,
        is_clipping_path: false,
    };
    layer.set_outline_color(pdf_color(color.0, color.1, color.2));
    layer.set_outline_thickness(thickness);
    layer.add_shape(line);
}

const PAGE_WIDTH: f64 = 210.0;
const PAGE_HEIGHT: f64 = 297.0;
const PAGE_MARGIN_X: f64 = 12.0;
const PAGE_TOP_Y: f64 = PAGE_HEIGHT - 17.0;
const CONTENT_WIDTH: f64 = PAGE_WIDTH - (PAGE_MARGIN_X * 2.0);
const SECTION_GAP: f64 = 7.0;
// Tableau légèrement plus dense
const TABLE_HEADER_HEIGHT: f64 = 9.5;
const TABLE_ROW_HEIGHT: f64 = 9.0;
const FOOTER_Y: f64 = 18.0;
const BLUE: (f64, f64, f64) = (0.0, 0.373, 0.561);
const ROW_LIGHT: (f64, f64, f64) = (0.976, 0.980, 0.984);

struct PdfFonts<'a> {
    regular: &'a printpdf::IndirectFontRef,
    bold: &'a printpdf::IndirectFontRef,
}

fn estimate_text_width(text: &str, font_size: f64) -> f64 {
    text.chars().count() as f64 * font_size * 0.18
}

fn draw_text(
    layer: &printpdf::PdfLayerReference,
    text: impl AsRef<str>,
    size: f64,
    x: f64,
    y: f64,
    font: &printpdf::IndirectFontRef,
    color: (f64, f64, f64),
) {
    use printpdf::Mm;

    layer.set_fill_color(pdf_color(color.0, color.1, color.2));
    layer.use_text(text.as_ref(), size, Mm(x), Mm(y), font);
}

fn draw_text_right(
    layer: &printpdf::PdfLayerReference,
    text: impl AsRef<str>,
    size: f64,
    right_x: f64,
    y: f64,
    font: &printpdf::IndirectFontRef,
    color: (f64, f64, f64),
) {
    let text = text.as_ref();
    draw_text(
        layer,
        text,
        size,
        right_x - estimate_text_width(text, size),
        y,
        font,
        color,
    );
}

fn draw_status_badge(
    layer: &printpdf::PdfLayerReference,
    status: &str,
    x: f64,
    y: f64,
    fonts: &PdfFonts,
) {
    let label = status_label(status);
    let width = status_badge_width(status);
    let (fill, text_color) = if status == "PAID" {
        ((0.863, 0.988, 0.906), (0.086, 0.388, 0.204))
    } else if status == "ARCHIVED" || status == "VOIDED" {
        ((0.898, 0.906, 0.922), (0.216, 0.255, 0.318))
    } else {
        ((0.859, 0.918, 0.996), (0.114, 0.306, 0.847))
    };
    draw_rect(layer, x, y, width, 7.0, fill, None);
    draw_text(layer, label, 7.0, x + 4.0, y - 4.9, fonts.bold, text_color);
}

fn status_badge_width(status: &str) -> f64 {
    estimate_text_width(status_label(status), 7.0) + 9.0
}

fn draw_status_badge_right(
    layer: &printpdf::PdfLayerReference,
    status: &str,
    right_x: f64,
    y: f64,
    fonts: &PdfFonts,
) {
    draw_status_badge(
        layer,
        status,
        right_x - status_badge_width(status),
        y,
        fonts,
    );
}

fn ensure_space_or_new_page(cursor_y: f64, required_height: f64) -> f64 {
    cursor_y.max(FOOTER_Y + required_height + SECTION_GAP)
}

fn draw_footer(
    layer: &printpdf::PdfLayerReference,
    fonts: &PdfFonts,
    collects_taxes: bool,
    muted: (f64, f64, f64),
    page_number: usize,
    page_total: usize,
) {
    // Ligne fine au-dessus du footer
    draw_line(
        layer,
        PAGE_MARGIN_X,
        FOOTER_Y + 6.0,
        PAGE_WIDTH - PAGE_MARGIN_X,
        FOOTER_Y + 6.0,
        (0.898, 0.906, 0.922),
        0.2,
    );
    draw_text(
        layer,
        if collects_taxes {
            "TPS et TVQ calculées selon les taux applicables."
        } else {
            "TPS/TVQ non applicables — petit fournisseur."
        },
        7.0,
        PAGE_MARGIN_X,
        FOOTER_Y,
        fonts.regular,
        muted,
    );
    draw_text(
        layer,
        "Facture générée électroniquement — aucune signature requise.",
        7.0,
        PAGE_MARGIN_X,
        FOOTER_Y - 4.5,
        fonts.regular,
        muted,
    );
    draw_text_right(
        layer,
        format!("Page {} / {}", page_number, page_total),
        7.0,
        PAGE_WIDTH - PAGE_MARGIN_X,
        FOOTER_Y - 4.5,
        fonts.regular,
        muted,
    );
}

fn generate_invoice_pdf_bytes(
    invoice: serde_json::Value,
    state_json: String,
) -> Result<Vec<u8>, String> {
    use printpdf::*;

    log::info!("[PDF] Commande generate_invoice_pdf appelée");
    log::info!("[PDF] Invoice reçu: {}", invoice);

    let state: serde_json::Value = match serde_json::from_str(&state_json) {
        Ok(parsed) => parsed,
        Err(error) => {
            log::error!("[PDF] Erreur parsing state JSON: {}", error);
            serde_json::Value::Null
        }
    };

    let invoice_numero = json_str(&invoice, "numero");
    let invoice_date = json_str(&invoice, "dateFacture");
    let invoice_due_date = json_str(&invoice, "dateEcheance");
    let invoice_status = json_str(&invoice, "status");
    let invoice_amount_cents = json_i64(&invoice, "amountCents");
    let invoice_hours = json_f64(&invoice, "hours");
    let mission = find_by_id(&state, "missions", json_str(&invoice, "missionId"));
    let pharmacien = find_by_id(&state, "pharmaciens", json_str(&invoice, "pharmacienId"));
    let pharmacie = find_by_id(&state, "pharmacies", json_str(&invoice, "pharmacieId"));

    let pharmacien_nom = pharmacien
        .map(|item| json_str(item, "nom"))
        .filter(|value| !value.is_empty())
        .unwrap_or("Pharmacien");
    let pharmacien_adresse = pharmacien
        .map(|item| json_str(item, "adresse"))
        .unwrap_or("");
    let pharmacien_ville = pharmacien.map(|item| json_str(item, "ville")).unwrap_or("");
    let pharmacien_code_postal = pharmacien
        .map(|item| json_str(item, "codePostal"))
        .unwrap_or("");
    let pharmacien_telephone = pharmacien
        .map(|item| json_str(item, "telephone"))
        .unwrap_or("");
    let pharmacien_email = pharmacien.map(|item| json_str(item, "email")).unwrap_or("");

    let pharmacie_nom = pharmacie
        .map(|item| {
            let display_label = json_str(item, "displayLabel");
            if display_label.is_empty() {
                json_str(item, "nom")
            } else {
                display_label
            }
        })
        .filter(|value| !value.is_empty())
        .unwrap_or("Pharmacie");
    let pharmacie_adresse = pharmacie
        .map(|item| json_str(item, "adresse"))
        .unwrap_or("");
    let pharmacie_ville = pharmacie.map(|item| json_str(item, "ville")).unwrap_or("");
    let pharmacie_code_postal = pharmacie
        .map(|item| json_str(item, "codePostal"))
        .unwrap_or("");
    let pharmacie_telephone = pharmacie
        .map(|item| json_str(item, "telephone"))
        .unwrap_or("");
    let pharmacie_email = pharmacie.map(|item| json_str(item, "email")).unwrap_or("");

    let mission_code = mission
        .map(|item| json_str(item, "missionCode"))
        .filter(|value| !value.is_empty())
        .unwrap_or(json_str(&invoice, "missionId"));
    let hourly_rate_cents = mission
        .map(|item| json_i64(item, "hourlyRateCents"))
        .filter(|value| *value > 0)
        .unwrap_or_else(|| {
            if invoice_hours > 0.0 {
                (invoice_amount_cents as f64 / invoice_hours).round() as i64
            } else {
                0
            }
        });

    let mut service_rows: Vec<(String, String, f64, i64, i64)> = Vec::new();
    if let Some(days) = mission
        .and_then(|item| item.get("days"))
        .and_then(|days| days.as_array())
    {
        for day in days {
            let hours = json_f64(day, "hours");
            let amount = (hours * hourly_rate_cents as f64).round() as i64;
            service_rows.push((
                json_str(day, "dateService").to_string(),
                if json_str(day, "description").is_empty() {
                    "Mission de remplacement".to_string()
                } else {
                    json_str(day, "description").to_string()
                },
                hours,
                hourly_rate_cents,
                amount,
            ));
        }
    }
    if service_rows.is_empty() {
        service_rows.push((
            invoice_date.to_string(),
            "Mission de remplacement".to_string(),
            invoice_hours,
            hourly_rate_cents,
            (invoice_hours * hourly_rate_cents as f64).round() as i64,
        ));
    }

    let mut expense_rows: Vec<(String, String, String, String, i64)> = Vec::new();
    if let Some(days) = mission
        .and_then(|item| item.get("days"))
        .and_then(|days| days.as_array())
    {
        for day in days {
            if let Some(expenses) = day.get("expenses").and_then(|expenses| expenses.as_array()) {
                for expense in expenses {
                    let amount_cents = json_i64(expense, "amountCents");
                    let detail = if json_str(expense, "typeKey") == "MILEAGE" {
                        let distance = json_f64(expense, "distanceKm");
                        let unit_rate = json_i64(expense, "unitRateCents");
                        if distance > 0.0 && unit_rate > 0 {
                            format!("{} × {}", format_km(distance), format_rate_cents(unit_rate))
                        } else {
                            "—".to_string()
                        }
                    } else if !json_str(expense, "notes").is_empty() {
                        json_str(expense, "notes").to_string()
                    } else {
                        "—".to_string()
                    };
                    expense_rows.push((
                        json_str(day, "dateService").to_string(),
                        expense_type_label(expense).to_string(),
                        json_str(expense, "label").to_string(),
                        detail,
                        amount_cents,
                    ));
                }
            }
        }
    }
    if expense_rows.is_empty() {
        if let Some(mission) = mission {
            let meal_total = json_i64(mission, "mealTotalCents");
            let mileage_total = json_i64(mission, "mileageTotalCents");
            let date = json_str(mission, "dateDebut").to_string();
            if meal_total > 0 {
                expense_rows.push((
                    date.clone(),
                    "Repas".to_string(),
                    "Frais repas forfaitaires".to_string(),
                    "—".to_string(),
                    meal_total,
                ));
            }
            if mileage_total > 0 {
                expense_rows.push((
                    date,
                    "Kilométrage".to_string(),
                    "Kilométrage".to_string(),
                    format!(
                        "{} × {}",
                        format_km(json_f64(mission, "mileageKm")),
                        format_rate_cents(json_i64(mission, "mileageRateCents"))
                    ),
                    mileage_total,
                ));
            }
        }
    }

    let fee_subtotal_cents: i64 = expense_rows.iter().map(|row| row.4).sum();
    let service_subtotal_cents = (invoice_amount_cents - fee_subtotal_cents).max(0);
    let collects_taxes = pharmacien
        .map(|item| json_str(item, "taxStatus") == "REGISTERED")
        .unwrap_or(false);
    let gst_cents = if collects_taxes {
        (invoice_amount_cents as f64 * 0.05).round() as i64
    } else {
        0
    };
    let qst_cents = if collects_taxes {
        (invoice_amount_cents as f64 * 0.09975).round() as i64
    } else {
        0
    };
    let grand_total_cents = invoice_amount_cents + gst_cents + qst_cents;
    let billed_mileage_cents: i64 = expense_rows
        .iter()
        .filter(|row| row.1 == "Kilométrage")
        .map(|row| row.4)
        .sum();

    log::info!(
        "[PDF] Rendu facture: {}, mission {}, lignes prestations {}, lignes frais {}, total {}",
        invoice_numero,
        mission_code,
        service_rows.len(),
        expense_rows.len(),
        money(grand_total_cents)
    );

    let (doc, page1, layer1) =
        PdfDocument::new("Facture_Pharmfact", Mm(210.0), Mm(297.0), "Layer 1");
    let mut current_layer = doc.get_page(page1).get_layer(layer1);
    let font = doc
        .add_external_font(Cursor::new(
            include_bytes!("../assets/fonts/Verdana.ttf").as_slice(),
        ))
        .map_err(|e| format!("[PDF] Erreur chargement police: {}", e))?;
    let font_bold = doc
        .add_external_font(Cursor::new(
            include_bytes!("../assets/fonts/VerdanaBold.ttf").as_slice(),
        ))
        .map_err(|e| format!("[PDF] Erreur chargement police: {}", e))?;
    let ink = (0.067, 0.094, 0.153);
    let muted = (0.294, 0.333, 0.388);
    let light_border = (0.898, 0.906, 0.922);
    let dark = (0.067, 0.094, 0.153);
    let fonts = PdfFonts {
        regular: &font,
        bold: &font_bold,
    };
    let mut page_layers = vec![current_layer.clone()];

    let mut cursor_y = PAGE_TOP_Y;

    // ============================================================================
    // HEADER - Logo PHARMFACT sans carré vide (Option B)
    // ============================================================================
    draw_text(
        &current_layer,
        "PHARMFACT",
        15.0,
        PAGE_MARGIN_X,
        cursor_y,
        fonts.bold,
        BLUE,
    );
    // Numéro de facture et statut à droite
    draw_text_right(
        &current_layer,
        invoice_numero,
        12.0,
        PAGE_WIDTH - PAGE_MARGIN_X,
        cursor_y,
        fonts.bold,
        BLUE,
    );
    draw_status_badge_right(
        &current_layer,
        invoice_status,
        PAGE_WIDTH - PAGE_MARGIN_X,
        cursor_y - 7.0,
        &fonts,
    );

    // Réduire légèrement le header (HEADER_GAP: 18.0 au lieu de 21.0)
    cursor_y -= 18.0;
    draw_line(
        &current_layer,
        PAGE_MARGIN_X,
        cursor_y,
        PAGE_WIDTH - PAGE_MARGIN_X,
        cursor_y,
        BLUE,
        0.8,
    );
    // Réduire l'espace après la ligne (AFTER_HEADER_LINE_GAP: 20.0 au lieu de 17.0)
    cursor_y -= 20.0;

    // ============================================================================
    // TITRE FACTURE - Réduit à 28pt pour un meilleur équilibre
    // ============================================================================
    draw_text(
        &current_layer,
        "FACTURE",
        28.0,
        PAGE_MARGIN_X,
        cursor_y,
        fonts.bold,
        ink,
    );
    // ============================================================================
    // MÉTADONNÉES - Alignement amélioré
    // ============================================================================
    let meta_label_x = PAGE_WIDTH - PAGE_MARGIN_X - 72.0;
    let meta_value_right = PAGE_WIDTH - PAGE_MARGIN_X;
    let meta_line_height = 6.0;
    draw_text(
        &current_layer,
        "Date d’émission :",
        9.0,
        meta_label_x,
        cursor_y - 2.0,
        fonts.bold,
        ink,
    );
    draw_text_right(
        &current_layer,
        invoice_date,
        9.0,
        meta_value_right,
        cursor_y - 2.0,
        fonts.regular,
        muted,
    );
    draw_text(
        &current_layer,
        "Date d’échéance :",
        9.0,
        meta_label_x,
        cursor_y - meta_line_height,
        fonts.bold,
        ink,
    );
    draw_text_right(
        &current_layer,
        invoice_due_date,
        9.0,
        meta_value_right,
        cursor_y - meta_line_height,
        fonts.regular,
        muted,
    );
    // Mission - Même alignement que les dates
    draw_text(
        &current_layer,
        "Mission :",
        9.0,
        meta_label_x,
        cursor_y - (meta_line_height * 2.0),
        fonts.bold,
        ink,
    );
    draw_text_right(
        &current_layer,
        mission_code,
        9.0,
        meta_value_right,
        cursor_y - (meta_line_height * 2.0),
        fonts.regular,
        muted,
    );

    // Espace après les métadonnées - légèrement réduit (28.0 au lieu de 34.0)
    cursor_y -= 28.0;
    let col_gap = 18.0;
    let col_w = (CONTENT_WIDTH - col_gap) / 2.0;
    let issuer_x = PAGE_MARGIN_X;
    let recipient_x = issuer_x + col_w + col_gap;

    for (title, x) in [("Émetteur", issuer_x), ("Destinataire", recipient_x)] {
        draw_text(&current_layer, title, 9.6, x, cursor_y, fonts.bold, BLUE);
        draw_line(
            &current_layer,
            x,
            cursor_y - 3.5,
            x + col_w,
            cursor_y - 3.5,
            BLUE,
            0.55,
        );
    }
    let mut issuer_y = cursor_y - 11.0;
    for (index, line) in [
        pharmacien_nom.to_string(),
        "Pharmacien remplaçant indépendant".to_string(),
        if pharmacien_adresse.is_empty() {
            "Adresse non renseignée".to_string()
        } else {
            pharmacien_adresse.to_string()
        },
        if pharmacien_ville.is_empty() {
            "Ville non renseignée".to_string()
        } else {
            format!("{}, QC {}", pharmacien_ville, pharmacien_code_postal)
        },
        format!(
            "Téléphone : {}",
            if pharmacien_telephone.is_empty() {
                "—"
            } else {
                pharmacien_telephone
            }
        ),
        format!(
            "Courriel : {}",
            if pharmacien_email.is_empty() {
                "—"
            } else {
                pharmacien_email
            }
        ),
    ]
    .iter()
    .enumerate()
    {
        draw_text(
            &current_layer,
            line,
            if index == 0 { 9.4 } else { 8.2 },
            issuer_x,
            issuer_y,
            if index == 0 {
                fonts.bold
            } else {
                fonts.regular
            },
            if index == 0 { ink } else { muted },
        );
        issuer_y -= if index == 0 { 5.2 } else { 4.5 };
    }

    let mut recipient_y = cursor_y - 11.0;
    for (index, line) in [
        pharmacie_nom.to_string(),
        if pharmacie_adresse.is_empty() {
            "Adresse non renseignée".to_string()
        } else {
            pharmacie_adresse.to_string()
        },
        if pharmacie_ville.is_empty() {
            "Ville non renseignée".to_string()
        } else {
            format!("{}, QC {}", pharmacie_ville, pharmacie_code_postal)
        },
        format!(
            "Téléphone : {}",
            if pharmacie_telephone.is_empty() {
                "—"
            } else {
                pharmacie_telephone
            }
        ),
        format!(
            "Courriel : {}",
            if pharmacie_email.is_empty() {
                "—"
            } else {
                pharmacie_email
            }
        ),
    ]
    .iter()
    .enumerate()
    {
        draw_text(
            &current_layer,
            line,
            if index == 0 { 9.4 } else { 8.2 },
            recipient_x,
            recipient_y,
            if index == 0 {
                fonts.bold
            } else {
                fonts.regular
            },
            if index == 0 { ink } else { muted },
        );
        recipient_y -= if index == 0 { 5.2 } else { 4.5 };
    }

    let travel_lines = travel_lines(mission, billed_mileage_cents);
    if billed_mileage_cents == 0 && travel_lines.len() > 1 {
        let note_y = issuer_y.min(recipient_y) - 3.0;
        draw_rect(
            &current_layer,
            PAGE_MARGIN_X,
            note_y + 3.5,
            CONTENT_WIDTH,
            8.0,
            ROW_LIGHT,
            Some(light_border),
        );
        draw_text(
            &current_layer,
            format!("Note mission : Distance indicative : {} — non facturé.", travel_lines[0]),
            7.8,
            PAGE_MARGIN_X + 3.0,
            note_y - 1.5,
            fonts.regular,
            muted,
        );
        recipient_y = note_y - 8.0;
        issuer_y = issuer_y.min(note_y - 8.0);
    }

    cursor_y = issuer_y.min(recipient_y) - 11.0;
    draw_rect(
        &current_layer,
        PAGE_MARGIN_X,
        cursor_y,
        CONTENT_WIDTH,
        TABLE_HEADER_HEIGHT,
        (0.988, 0.992, 0.996),
        None,
    );
    for (label, x) in [
        ("Date", PAGE_MARGIN_X),
        ("Description de la mission", 42.0),
        ("Heures / Qté", 124.0),
        ("Taux", 153.0),
        ("Total", 181.0),
    ] {
        draw_text(
            &current_layer,
            label,
            7.9,
            x,
            cursor_y - 6.4,
            fonts.bold,
            dark,
        );
    }
    draw_line(
        &current_layer,
        PAGE_MARGIN_X,
        cursor_y - TABLE_HEADER_HEIGHT,
        PAGE_WIDTH - PAGE_MARGIN_X,
        cursor_y - TABLE_HEADER_HEIGHT,
        BLUE,
        0.9,
    );
    cursor_y -= TABLE_HEADER_HEIGHT;

    for (index, (date, description, hours, rate, amount)) in service_rows.iter().enumerate() {
        if cursor_y - TABLE_ROW_HEIGHT < FOOTER_Y + 14.0 {
            let (page, layer) = doc.add_page(
                Mm(PAGE_WIDTH),
                Mm(PAGE_HEIGHT),
                format!("Layer {}", page_layers.len() + 1),
            );
            current_layer = doc.get_page(page).get_layer(layer);
            page_layers.push(current_layer.clone());
            cursor_y = PAGE_TOP_Y;
            for (label, x) in [
                ("Date", PAGE_MARGIN_X),
                ("Description de la mission", 42.0),
                ("Heures / Qté", 124.0),
                ("Taux", 153.0),
                ("Total", 181.0),
            ] {
                draw_text(
                    &current_layer,
                    label,
                    7.9,
                    x,
                    cursor_y - 6.4,
                    fonts.bold,
                    dark,
                );
            }
            draw_line(
                &current_layer,
                PAGE_MARGIN_X,
                cursor_y - TABLE_HEADER_HEIGHT,
                PAGE_WIDTH - PAGE_MARGIN_X,
                cursor_y - TABLE_HEADER_HEIGHT,
                BLUE,
                0.9,
            );
            cursor_y -= TABLE_HEADER_HEIGHT;
        }
        if index % 2 == 1 {
            draw_rect(
                &current_layer,
                PAGE_MARGIN_X,
                cursor_y,
                CONTENT_WIDTH,
                TABLE_ROW_HEIGHT,
                ROW_LIGHT,
                None,
            );
        }
        let row_text_y = cursor_y - 6.0;
        draw_text(
            &current_layer,
            date,
            7.4,
            PAGE_MARGIN_X,
            row_text_y,
            fonts.regular,
            ink,
        );
        draw_text(
            &current_layer,
            truncate_chars(description, 42),
            7.5,
            42.0,
            row_text_y,
            fonts.regular,
            ink,
        );
        draw_text_right(
            &current_layer,
            format_hours(*hours),
            7.5,
            143.0,
            row_text_y,
            fonts.regular,
            ink,
        );
        draw_text_right(
            &current_layer,
            money(*rate),
            7.5,
            171.0,
            row_text_y,
            fonts.regular,
            ink,
        );
        draw_text_right(
            &current_layer,
            money(*amount),
            7.5,
            PAGE_WIDTH - PAGE_MARGIN_X,
            row_text_y,
            fonts.bold,
            ink,
        );
        // Séparation sous la ligne plus subtile (0.1 au lieu de 0.15)
        draw_line(
            &current_layer,
            PAGE_MARGIN_X,
            cursor_y - TABLE_ROW_HEIGHT,
            PAGE_WIDTH - PAGE_MARGIN_X,
            cursor_y - TABLE_ROW_HEIGHT,
            light_border,
            0.1,
        );
        cursor_y -= TABLE_ROW_HEIGHT;
    }
    for (index, (date, type_label, label, detail, amount)) in expense_rows.iter().enumerate() {
        if cursor_y - TABLE_ROW_HEIGHT < FOOTER_Y + 14.0 {
            let (page, layer) = doc.add_page(
                Mm(PAGE_WIDTH),
                Mm(PAGE_HEIGHT),
                format!("Layer {}", page_layers.len() + 1),
            );
            current_layer = doc.get_page(page).get_layer(layer);
            page_layers.push(current_layer.clone());
            cursor_y = PAGE_TOP_Y;
            draw_rect(
                &current_layer,
                PAGE_MARGIN_X,
                cursor_y,
                CONTENT_WIDTH,
                TABLE_HEADER_HEIGHT,
                (0.988, 0.992, 0.996),
                None,
            );
            for (label, x) in [
                ("Date", PAGE_MARGIN_X),
                ("Description de la mission", 42.0),
                ("Heures / Qté", 124.0),
                ("Taux", 153.0),
                ("Total", 181.0),
            ] {
                draw_text(
                    &current_layer,
                    label,
                    7.9,
                    x,
                    cursor_y - 6.4,
                    fonts.bold,
                    dark,
                );
            }
            draw_line(
                &current_layer,
                PAGE_MARGIN_X,
                cursor_y - TABLE_HEADER_HEIGHT,
                PAGE_WIDTH - PAGE_MARGIN_X,
                cursor_y - TABLE_HEADER_HEIGHT,
                BLUE,
                0.9,
            );
            cursor_y -= TABLE_HEADER_HEIGHT;
        }
        if (service_rows.len() + index) % 2 == 1 {
            draw_rect(
                &current_layer,
                PAGE_MARGIN_X,
                cursor_y,
                CONTENT_WIDTH,
                TABLE_ROW_HEIGHT,
                ROW_LIGHT,
                None,
            );
        }
        let row_text_y = cursor_y - 6.0;
        let (quantity, rate_text) = if type_label == "Kilométrage" {
            let parts: Vec<&str> = detail.split('×').collect();
            if parts.len() == 2 {
                (
                    parts[0].trim().to_string(),
                    parts[1].trim().replace(" / km", ""),
                )
            } else {
                (detail.to_string(), "—".to_string())
            }
        } else {
            ("—".to_string(), "—".to_string())
        };
        draw_text(
            &current_layer,
            date,
            7.4,
            PAGE_MARGIN_X,
            row_text_y,
            fonts.regular,
            ink,
        );
        draw_text(
            &current_layer,
            truncate_chars(&format!("{} — {}", type_label, label), 42),
            7.4,
            42.0,
            row_text_y,
            fonts.regular,
            ink,
        );
        draw_text_right(
            &current_layer,
            quantity,
            7.4,
            143.0,
            row_text_y,
            fonts.regular,
            ink,
        );
        draw_text_right(
            &current_layer,
            rate_text,
            7.4,
            171.0,
            row_text_y,
            fonts.regular,
            ink,
        );
        draw_text_right(
            &current_layer,
            money(*amount),
            7.4,
            PAGE_WIDTH - PAGE_MARGIN_X,
            row_text_y,
            fonts.bold,
            ink,
        );
        // Séparation sous la ligne plus subtile (0.1 au lieu de 0.15)
        draw_line(
            &current_layer,
            PAGE_MARGIN_X,
            cursor_y - TABLE_ROW_HEIGHT,
            PAGE_WIDTH - PAGE_MARGIN_X,
            cursor_y - TABLE_ROW_HEIGHT,
            light_border,
            0.1,
        );
        cursor_y -= TABLE_ROW_HEIGHT;
    }

    let paid_at = json_str(&invoice, "paidAt");
    let (payment_title, payment_lines): (&str, Vec<String>) = match invoice_status {
        "PAID" => (
            "MODALITÉS DE PAIEMENT",
            vec![
                "Facture acquittée.".to_string(),
                format!(
                    "Paiement reçu le {}.",
                    if paid_at.is_empty() {
                        invoice_date
                    } else {
                        paid_at
                    }
                ),
                "Aucun paiement supplémentaire requis.".to_string(),
            ],
        ),
        "VOIDED" => (
            "FACTURE ANNULÉE",
            vec![format!("Référence : {}", invoice_numero)],
        ),
        "SENT" => (
            "MODALITÉS DE PAIEMENT",
            vec![
                format!("Paiement attendu avant le {}.", invoice_due_date),
                format!("Référence à indiquer : {}", invoice_numero),
            ],
        ),
        _ => (
            "MODALITÉS DE PAIEMENT",
            vec![
                format!("Paiement attendu avant le {}.", invoice_due_date),
                format!("Référence à indiquer : {}", invoice_numero),
            ],
        ),
    };

    cursor_y -= 5.0;
    if cursor_y < FOOTER_Y + 46.0 + SECTION_GAP {
        let (page, layer) = doc.add_page(
            Mm(PAGE_WIDTH),
            Mm(PAGE_HEIGHT),
            format!("Layer {}", page_layers.len() + 1),
        );
        current_layer = doc.get_page(page).get_layer(layer);
        page_layers.push(current_layer.clone());
        cursor_y = PAGE_TOP_Y;
    }
    // Rattacher visuellement le total au tableau (GAP_TABLE_TO_TOTALS: 18.0)
    cursor_y = ensure_space_or_new_page(cursor_y, 18.0);
    let totals_w = 86.0;
    let totals_x = PAGE_WIDTH - PAGE_MARGIN_X - totals_w;
    let total_label_x = totals_x;
    let total_value_right = PAGE_WIDTH - PAGE_MARGIN_X;
    let mut totals_line_y = cursor_y;
    for (label, value) in [
        (
            "Sous-total",
            money(service_subtotal_cents + fee_subtotal_cents),
        ),
        (
            "TPS (5 %)",
            if collects_taxes {
                money(gst_cents)
            } else {
                "Non applicable".to_string()
            },
        ),
        (
            "TVQ (9,975 %)",
            if collects_taxes {
                money(qst_cents)
            } else {
                "Non applicable".to_string()
            },
        ),
    ] {
        draw_text(
            &current_layer,
            label,
            8.8,
            total_label_x,
            totals_line_y,
            fonts.regular,
            muted,
        );
        draw_text_right(
            &current_layer,
            value,
            8.8,
            total_value_right,
            totals_line_y,
            fonts.regular,
            ink,
        );
        totals_line_y -= 6.3;
    }
    draw_line(
        &current_layer,
        total_label_x,
        totals_line_y + 1.5,
        total_value_right,
        totals_line_y + 1.5,
        BLUE,
        0.9,
    );
    draw_text(
        &current_layer,
        "TOTAL",
        18.0,
        total_label_x,
        totals_line_y - 9.0,
        fonts.bold,
        BLUE,
    );
    draw_text_right(
        &current_layer,
        money(grand_total_cents),
        18.0,
        total_value_right,
        totals_line_y - 9.0,
        fonts.bold,
        BLUE,
    );

    let bottom_y = (totals_line_y - 29.0).max(FOOTER_Y + 28.0);
    draw_text(
        &current_layer,
        payment_title,
        8.5,
        PAGE_MARGIN_X,
        bottom_y,
        fonts.bold,
        BLUE,
    );
    let mut payment_y = bottom_y - 6.0;
    for line in payment_lines {
        draw_text(
            &current_layer,
            line,
            8.0,
            PAGE_MARGIN_X,
            payment_y,
            fonts.regular,
            muted,
        );
        payment_y -= 5.0;
    }
    draw_text_right(
        &current_layer,
        "Merci de votre confiance.",
        15.0,
        PAGE_WIDTH - PAGE_MARGIN_X,
        bottom_y,
        fonts.bold,
        ink,
    );

    let page_total = page_layers.len();
    for (index, layer) in page_layers.iter().enumerate() {
        draw_footer(layer, &fonts, collects_taxes, muted, index + 1, page_total);
    }

    // Finaliser le PDF
    let mut bytes = Vec::new();
    {
        let mut writer = BufWriter::new(&mut bytes);
        doc.save(&mut writer)
            .map_err(|e| format!("[PDF] Erreur génération PDF: {}", e))?;
    }

    // Vérifier que le PDF commence par le header %PDF-
    if bytes.len() < 5 || &bytes[0..4] != b"%PDF" {
        log::error!(
            "[PDF] Buffer PDF invalide: ne commence pas par %PDF- (taille: {} bytes)",
            bytes.len()
        );
        return Err("Erreur interne: génération PDF échouée".to_string());
    }

    log::info!(
        "[PDF] PDF généré avec succès ({} bytes) pour facture {}",
        bytes.len(),
        invoice_numero
    );
    Ok(bytes)
}

#[tauri::command]
async fn generate_invoice_pdf(
    invoice: serde_json::Value,
    state_json: String,
) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};

    let bytes = tauri::async_runtime::spawn_blocking(move || generate_invoice_pdf_bytes(invoice, state_json))
        .await
        .map_err(|error| format!("[PDF] Erreur de génération: {}", error))??;

    // Encoder en base64 pour le retour JSON
    let base64_result = STANDARD.encode(&bytes);
    log::debug!("[PDF] Base64 générée, longueur: {}", base64_result.len());
    Ok(base64_result)
}

// ============================================================================
// Configuration de l'application
// ============================================================================

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // Stockage
            load_state,
            save_state,
            export_state,
            import_state,
            clear_state,
            // Géocodage
            geocode_address,
            route_distance,
            fetch_opq_pharmacist_registry,
            // Fichiers
            download_file,
            read_file_text,
            // PDF
            generate_invoice_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors de l'exécution de l'application Tauri");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generate_invoice_pdf_bytes_starts_with_pdf_header() {
        let invoice = serde_json::json!({
            "numero": "FAC-TEST-001",
            "dateFacture": "2026-06-11",
            "pharmacieNom": "Pharmacie Test",
            "pharmacieAdresse": "123 rue Test",
            "pharmacienNom": "Jean Test",
            "amountCents": 12345
        });

        let bytes = generate_invoice_pdf_bytes(invoice, "{}".to_string())
            .expect("PDF bytes should be generated");

        assert!(bytes.starts_with(b"%PDF"));
    }

    #[test]
    fn pdf_labels_keep_french_accents() {
        assert_eq!(status_label("DRAFT"), "À PAYER");
        assert_eq!(status_label("PAID"), "PAYÉE");
        assert_eq!(status_label("SENT"), "ENVOYÉE");

        let mileage = serde_json::json!({ "typeKey": "MILEAGE" });
        let toll = serde_json::json!({ "typeKey": "TOLL" });
        let lodging = serde_json::json!({ "typeKey": "LODGING" });

        assert_eq!(expense_type_label(&mileage), "Kilométrage");
        assert_eq!(expense_type_label(&toll), "Péage");
        assert_eq!(expense_type_label(&lodging), "Hébergement");
    }

    #[test]
    fn pdf_numbers_use_french_formatting() {
        assert_eq!(format_money_cents(88000), "880,00 $");
        assert_eq!(format_hours(8.0), "8,00 h");
        assert_eq!(format_km(36.5), "36,5 km");
        assert_eq!(format_rate_cents_per_km(61), "0,61 $ / km");
    }

    #[test]
    fn geocode_values_support_nominatim_payloads() {
        let item = serde_json::json!({
            "display_name": "100 rue Saint-Denis, Montréal, Québec, Canada",
            "lat": "45.515",
            "lon": "-73.56",
            "city": "Montréal",
            "state": "Québec",
            "postcode": "H2X 3K4",
            "country_code": "ca",
            "address": {
                "road": "rue Saint-Denis",
                "house_number": "100"
            }
        });

        let suggestion = geocode_suggestion_from_value(&item, "nominatim")
            .expect("Nominatim suggestion should be normalized");

        assert_eq!(suggestion.display_name, "100 rue Saint-Denis, Montréal, Québec, Canada");
        assert_eq!(suggestion.address_line, "100 rue Saint-Denis");
        assert_eq!(suggestion.city, "Montréal");
        assert_eq!(suggestion.province, "Québec");
        assert_eq!(suggestion.postcode, "H2X 3K4");
        assert_eq!(suggestion.country_code, "ca");
        assert_eq!(suggestion.lat, Some(45.515));
        assert_eq!(suggestion.lng, Some(-73.56));
    }

    #[test]
    fn route_distance_payload_rounds_kilometers() {
        let payload = serde_json::json!({
            "routes": [
                {
                    "distance": 12345.0
                }
            ]
        });

        let distance = route_distance_from_payload(&payload)
            .expect("OSRM route distance should be normalized");

        assert_eq!(distance.distance_aller_km, 12);
        assert_eq!(distance.distance_km, 24);
        assert_eq!(distance.source, "route");
    }

    #[test]
    fn route_distance_payload_rejects_invalid_distance() {
        let payload = serde_json::json!({
            "routes": [
                {
                    "distance": 0.0
                }
            ]
        });

        assert!(route_distance_from_payload(&payload).is_none());
    }

    #[test]
    fn opq_registry_entries_parse_public_index_payload() {
        let payload = r#"[{
            "id": "opq-1",
            "fullName": "Isabelle Fleurent",
            "licenseNumber": "093224",
            "studentLicenseNumber": null,
            "city": "QUEBEC",
            "isStudent": false
        }]"#;

        let entries: Vec<OpqPharmacistRegistryEntry> =
            serde_json::from_str(payload).expect("OPQ registry payload should parse");

        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].full_name, "Isabelle Fleurent");
        assert_eq!(entries[0].license_number.as_deref(), Some("093224"));
        assert!(!entries[0].is_student);
    }

    #[test]
    fn geocode_values_reject_non_quebec_payloads() {
        let item = serde_json::json!({
            "display_name": "100 King Street, Toronto, Ontario, Canada",
            "lat": 43.65,
            "lon": -79.38,
            "city": "Toronto",
            "state": "Ontario",
            "country_code": "ca"
        });

        assert!(geocode_suggestion_from_value(&item, "nominatim").is_none());
    }

    #[test]
    fn pdf_travel_lines_mark_unbilled_mileage() {
        let mission = serde_json::json!({
            "mileageKm": 36.5,
            "mileageRateCents": 61
        });

        let lines = travel_lines(Some(&mission), 0);

        assert_eq!(lines[0], "36,5 km aller-retour");
        assert_eq!(lines[1], "0,61 $ / km");
        assert_eq!(lines[2], "Distance indicative — non facturé");
    }

    #[test]
    fn pdf_travel_lines_show_billed_mileage_amount() {
        let mission = serde_json::json!({
            "mileageKm": 36.5,
            "mileageRateCents": 61
        });

        let lines = travel_lines(Some(&mission), 2227);

        assert_eq!(lines[0], "36,5 km aller-retour");
        assert_eq!(lines[1], "0,61 $ / km");
        assert_eq!(lines[2], "22,27 $");
    }

    fn sample_state(days_count: usize) -> (serde_json::Value, String) {
        let days: Vec<serde_json::Value> = (0..days_count)
            .map(|index| {
                serde_json::json!({
                    "id": format!("day-{}", index + 1),
                    "dateService": format!("2026-06-{:02}", (index % 28) + 1),
                    "description": "Remplacement en officine",
                    "hours": 8.0,
                    "expenses": []
                })
            })
            .collect();
        let amount_cents = days_count as i64 * 8 * 11000;
        let state = serde_json::json!({
            "pharmaciens": [{
                "id": "pharmacien-1",
                "nom": "Jim Tremblay",
                "adresse": "123 rue Saint-Denis",
                "ville": "Montréal",
                "codePostal": "H2X 1Y4",
                "telephone": "514 555-0101",
                "email": "jim@example.com",
                "taxStatus": "SMALL_SUPPLIER"
            }],
            "pharmacies": [{
                "id": "pharmacie-1",
                "nom": "PJC 021",
                "adresse": "4466 Beaubien E",
                "ville": "Montréal",
                "codePostal": "H1T 1T2",
                "telephone": "514 555-0202",
                "email": "pjc021@example.com"
            }],
            "missions": [{
                "id": "mission-1",
                "missionCode": "MIS-2026-3008",
                "dateDebut": "2026-06-11",
                "hourlyRateCents": 11000,
                "mileageKm": 36.5,
                "mileageRateCents": 61,
                "mileageTotalCents": 0,
                "mealTotalCents": 0,
                "days": days
            }]
        });
        let invoice = serde_json::json!({
            "id": "invoice-1",
            "numero": "FAC-2026-0001",
            "dateFacture": "2026-06-11",
            "dateEcheance": "2026-07-11",
            "missionId": "mission-1",
            "pharmacienId": "pharmacien-1",
            "pharmacieId": "pharmacie-1",
            "status": "DRAFT",
            "hours": days_count as f64 * 8.0,
            "amountCents": amount_cents
        });

        (invoice, state.to_string())
    }

    #[test]
    #[ignore]
    fn write_invoice_pdf_visual_samples() {
        let output_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("target")
            .join("pdf-samples");
        std::fs::create_dir_all(&output_dir).expect("sample output directory should be created");

        let (short_invoice, short_state) = sample_state(1);
        let short_bytes = generate_invoice_pdf_bytes(short_invoice, short_state)
            .expect("short visual sample should be generated");
        let short_path = output_dir.join("facture-test-courte.pdf");
        std::fs::write(&short_path, &short_bytes).expect("short visual sample should be written");

        let (long_invoice, long_state) = sample_state(42);
        let long_bytes = generate_invoice_pdf_bytes(long_invoice, long_state)
            .expect("long visual sample should be generated");
        let long_path = output_dir.join("facture-test-longue-3-pages.pdf");
        std::fs::write(&long_path, &long_bytes).expect("long visual sample should be written");

        println!("PDF court: {}", short_path.display());
        println!("PDF long: {}", long_path.display());
    }
}
