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
        return Ok("null".to_string());
    }

    let content = fs::read_to_string(&state_path).map_err(|e| format!("Erreur de lecture: {}", e))?;
    let trimmed = content.trim();
    if trimmed.is_empty() || trimmed == "{}" {
        Ok("null".to_string())
    } else {
        Ok(content)
    }
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
    let state = load_state(app).await?;
    if state.trim().is_empty() {
        Ok("null".to_string())
    } else {
        Ok(state)
    }
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
    let absolute = cents.abs();
    let whole = absolute / 100;
    let fractional = absolute % 100;
    let digits = whole.to_string();
    let integer_part = digits
        .chars()
        .rev()
        .collect::<Vec<char>>()
        .chunks(3)
        .map(|chunk| chunk.iter().rev().collect::<String>())
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect::<Vec<_>>()
        .join("\u{202f}");
    format!(
        "{}{}.{:02} $",
        if cents < 0 { "-" } else { "" },
        integer_part,
        fractional
    )
    .replace('.', ",")
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

fn month_name_fr(month: u32) -> &'static str {
    match month {
        1 => "janvier",
        2 => "février",
        3 => "mars",
        4 => "avril",
        5 => "mai",
        6 => "juin",
        7 => "juillet",
        8 => "août",
        9 => "septembre",
        10 => "octobre",
        11 => "novembre",
        12 => "décembre",
        _ => "",
    }
}

fn parse_iso_date(value: &str) -> Option<(i32, u32, u32)> {
    let mut parts = value.split('-');
    let year = parts.next()?.parse::<i32>().ok()?;
    let month = parts.next()?.parse::<u32>().ok()?;
    let day = parts.next()?.parse::<u32>().ok()?;
    Some((year, month, day))
}

fn days_from_civil(year: i32, month: u32, day: u32) -> i64 {
    let year = year - i32::from(month <= 2);
    let era = if year >= 0 { year } else { year - 399 } / 400;
    let yoe = year - era * 400;
    let month = month as i32;
    let day = day as i32;
    let doy = (153 * (month + if month > 2 { -3 } else { 9 }) + 2) / 5 + day - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    (era * 146097 + doe - 719468) as i64
}

fn iso_dates_are_consecutive(previous: &str, next: &str) -> bool {
    match (parse_iso_date(previous), parse_iso_date(next)) {
        (Some((py, pm, pd)), Some((ny, nm, nd))) => {
            days_from_civil(ny, nm, nd) - days_from_civil(py, pm, pd) == 1
        }
        _ => false,
    }
}

fn format_iso_date_fr(value: &str) -> String {
    if let Some((year, month, day)) = parse_iso_date(value) {
        let month_name = month_name_fr(month);
        if !month_name.is_empty() {
            return format!("{} {} {}", day, month_name, year);
        }
    }
    value.to_string()
}

fn format_date_span_fr(start: &str, end: &str) -> String {
    if start.is_empty() {
        return format_iso_date_fr(end);
    }
    if end.is_empty() {
        return format_iso_date_fr(start);
    }
    match (parse_iso_date(start), parse_iso_date(end)) {
        (Some((sy, sm, sd)), Some((ey, em, ed))) if sy == ey && sm == em => {
            format!("{} au {} {} {}", sd, ed, month_name_fr(sm), sy)
        }
        _ => format!("{} au {}", format_iso_date_fr(start), format_iso_date_fr(end)),
    }
}

fn format_date_list_fr(dates: &[String]) -> String {
    match dates {
        [] => "—".to_string(),
        [single] => format_iso_date_fr(single),
        _ => format_date_span_fr(&dates[0], dates.last().unwrap()),
    }
}

fn format_mileage_detail(km: f64, rate_cents: i64, amount_cents: i64) -> String {
    format!(
        "{} × {} = {}",
        format_km(km),
        format_rate_cents(rate_cents),
        money(amount_cents)
    )
}

fn mission_invoice_label(mission: &serde_json::Value) -> String {
    let invoice_label = json_str(mission, "invoiceLabel").trim();
    if !invoice_label.is_empty() {
        return invoice_label.to_string();
    }
    match json_str(mission, "actType") {
        "REMPLACEMENT_OFFICINE" => "Remplacement en officine".to_string(),
        "PHARMACIEN_GMF" => "Services professionnels en GMF".to_string(),
        "CLINIQUE" => "Services professionnels en clinique".to_string(),
        "TELEPHARMACIE" => "Services de télépharmacie".to_string(),
        "CONSEIL_FORMATION" => "Conseil et formation".to_string(),
        _ => "Services professionnels".to_string(),
    }
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

#[cfg(test)]
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
// Tableau légèrement plus dense
const TABLE_HEADER_HEIGHT: f64 = 9.5;
const FOOTER_Y: f64 = 18.0;
const BLUE: (f64, f64, f64) = (0.0, 0.373, 0.561);
const ROW_LIGHT: (f64, f64, f64) = (0.976, 0.980, 0.984);

struct PdfFonts<'a> {
    regular: &'a printpdf::IndirectFontRef,
    bold: &'a printpdf::IndirectFontRef,
}

#[derive(Clone)]
struct ServiceLine {
    dates: Vec<String>,
    description: String,
    hours: f64,
    rate_cents: i64,
    amount_cents: i64,
}

#[derive(Clone)]
struct ExpenseLine {
    date: String,
    label: String,
    detail: String,
    amount_cents: i64,
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

fn draw_footer(
    layer: &printpdf::PdfLayerReference,
    fonts: &PdfFonts,
    collects_taxes: bool,
    invoice_ref: &str,
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
    let footer_right = if page_total > 1 {
        format!("{} · Page {} / {}", invoice_ref, page_number, page_total)
    } else {
        invoice_ref.to_string()
    };
    draw_text(
        layer,
        if collects_taxes {
            "TPS et TVQ calculées selon les taux applicables."
        } else {
            "Petit fournisseur : TPS/TVQ non perçues, sous réserve de votre situation fiscale."
        },
        7.0,
        PAGE_MARGIN_X,
        FOOTER_Y,
        fonts.regular,
        muted,
    );
    draw_text(
        layer,
        "Facture générée par PharmFact — document conservé localement.",
        7.0,
        PAGE_MARGIN_X,
        FOOTER_Y - 4.5,
        fonts.regular,
        muted,
    );
    draw_text_right(
        layer,
        footer_right,
        7.0,
        PAGE_WIDTH - PAGE_MARGIN_X,
        FOOTER_Y - 4.5,
        fonts.regular,
        muted,
    );
}

fn add_pdf_page(
    doc: &printpdf::PdfDocumentReference,
    page_layers: &mut Vec<printpdf::PdfLayerReference>,
) -> printpdf::PdfLayerReference {
    use printpdf::Mm;

    let (page, layer) = doc.add_page(
        Mm(PAGE_WIDTH),
        Mm(PAGE_HEIGHT),
        format!("Layer {}", page_layers.len() + 1),
    );
    let current_layer = doc.get_page(page).get_layer(layer);
    page_layers.push(current_layer.clone());
    current_layer
}

fn draw_table_header(
    layer: &printpdf::PdfLayerReference,
    fonts: &PdfFonts,
    y: f64,
) {
    draw_rect(
        layer,
        PAGE_MARGIN_X,
        y,
        CONTENT_WIDTH,
        TABLE_HEADER_HEIGHT,
        (0.988, 0.992, 0.996),
        None,
    );
    for (label, x) in [
        ("Date", PAGE_MARGIN_X),
        ("Prestation", 42.0),
        ("Heures", 127.0),
        ("Taux", 156.0),
        ("Montant", 181.0),
    ] {
        draw_text(layer, label, 7.8, x, y - 6.3, fonts.bold, (0.067, 0.094, 0.153));
    }
    draw_line(
        layer,
        PAGE_MARGIN_X,
        y - TABLE_HEADER_HEIGHT,
        PAGE_WIDTH - PAGE_MARGIN_X,
        y - TABLE_HEADER_HEIGHT,
        BLUE,
        0.8,
    );
}

fn draw_followup_header(
    layer: &printpdf::PdfLayerReference,
    fonts: &PdfFonts,
    invoice_numero: &str,
    pharmacie_nom: &str,
    total_cents: i64,
    y: f64,
) {
    let summary = format!(
        "Facture {} — {} — Total {}",
        invoice_numero,
        truncate_chars(pharmacie_nom, 28),
        money(total_cents)
    );
    draw_text(layer, summary, 10.2, PAGE_MARGIN_X, y, fonts.bold, BLUE);
    draw_line(
        layer,
        PAGE_MARGIN_X,
        y - 4.5,
        PAGE_WIDTH - PAGE_MARGIN_X,
        y - 4.5,
        BLUE,
        0.45,
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
    let mission_date_debut = mission.map(|item| json_str(item, "dateDebut")).unwrap_or(invoice_date);
    let mission_meal_total_cents = mission.map(|item| json_i64(item, "mealTotalCents")).unwrap_or(0);
    let mission_mileage_total_cents = mission.map(|item| json_i64(item, "mileageTotalCents")).unwrap_or(0);
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
    let mission_label = mission.map(mission_invoice_label).unwrap_or_else(|| "Services professionnels".to_string());
    let mission_period = mission
        .map(|item| format_date_span_fr(json_str(item, "dateDebut"), json_str(item, "dateFin")))
        .unwrap_or_else(|| format_iso_date_fr(invoice_date));
    let mission_days = mission
        .and_then(|item| item.get("days"))
        .and_then(|days| days.as_array())
        .map(|days| days.len())
        .filter(|count| *count > 0)
        .unwrap_or(1);
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
        truncate_chars(&mission_label, 28),
        8.8,
        meta_value_right,
        cursor_y - (meta_line_height * 2.0),
        fonts.regular,
        muted,
    );
    draw_text(
        &current_layer,
        "Période :",
        9.0,
        meta_label_x,
        cursor_y - (meta_line_height * 3.0),
        fonts.bold,
        ink,
    );
    draw_text_right(
        &current_layer,
        truncate_chars(&mission_period, 28),
        8.8,
        meta_value_right,
        cursor_y - (meta_line_height * 3.0),
        fonts.regular,
        muted,
    );
    draw_text(
        &current_layer,
        "Jours / heures :",
        9.0,
        meta_label_x,
        cursor_y - (meta_line_height * 4.0),
        fonts.bold,
        ink,
    );
    draw_text_right(
        &current_layer,
        format!("{} j · {}", mission_days, format_hours(invoice_hours)),
        8.8,
        meta_value_right,
        cursor_y - (meta_line_height * 4.0),
        fonts.regular,
        muted,
    );

    // Espace après les métadonnées - légèrement réduit (28.0 au lieu de 34.0)
    cursor_y -= 32.0;
    let col_gap = 18.0;
    let col_w = (CONTENT_WIDTH - col_gap) / 2.0;
    let issuer_x = PAGE_MARGIN_X;
    let recipient_x = issuer_x + col_w + col_gap;

    for (title, x) in [("Émetteur", issuer_x), ("Facturé à", recipient_x)] {
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

    cursor_y = issuer_y.min(recipient_y) - 7.0;

    let mut service_lines: Vec<ServiceLine> = Vec::new();
    if let Some(days) = mission
        .and_then(|item| item.get("days"))
        .and_then(|days| days.as_array())
    {
        for day in days {
            let date = json_str(day, "dateService");
            let hours = json_f64(day, "hours");
            let description = if json_str(day, "description").is_empty() {
                "Remplacement en officine".to_string()
            } else {
                json_str(day, "description").to_string()
            };
            let amount = (hours * hourly_rate_cents as f64).round() as i64;
            if amount <= 0 {
                continue;
            }
            if let Some(last) = service_lines.last_mut() {
                let last_date = last.dates.last().cloned().unwrap_or_default();
                if last.description == description
                    && (last.hours / last.dates.len() as f64 - hours).abs() < 0.001
                    && last.rate_cents == hourly_rate_cents
                    && iso_dates_are_consecutive(&last_date, date)
                {
                    last.dates.push(date.to_string());
                    last.hours += hours;
                    last.amount_cents += amount;
                    continue;
                }
            }

            service_lines.push(ServiceLine {
                dates: vec![date.to_string()],
                description,
                hours,
                rate_cents: hourly_rate_cents,
                amount_cents: amount,
            });
        }
    }
    if service_lines.is_empty() {
        service_lines.push(ServiceLine {
            dates: vec![invoice_date.to_string()],
            description: "Mission de remplacement".to_string(),
            hours: invoice_hours,
            rate_cents: hourly_rate_cents,
            amount_cents: (invoice_hours * hourly_rate_cents as f64).round() as i64,
        });
    }

    let mut expense_lines: Vec<ExpenseLine> = Vec::new();
    let mut saw_meal = false;
    let mut saw_mileage = false;
    if let Some(days) = mission
        .and_then(|item| item.get("days"))
        .and_then(|days| days.as_array())
    {
        for day in days {
            let date = json_str(day, "dateService");
            if let Some(expenses) = day.get("expenses").and_then(|expenses| expenses.as_array()) {
                for expense in expenses {
                    let amount_cents = json_i64(expense, "amountCents");
                    if amount_cents <= 0 {
                        continue;
                    }
                    let type_key = json_str(expense, "typeKey");
                    let label = if type_key == "MILEAGE" {
                        saw_mileage = true;
                        "Déplacement".to_string()
                    } else if type_key == "MEAL" {
                        saw_meal = true;
                        "Repas".to_string()
                    } else {
                        expense_type_label(expense).to_string()
                    };
                    let detail = if type_key == "MILEAGE" {
                        let distance = json_f64(expense, "distanceKm");
                        let unit_rate = json_i64(expense, "unitRateCents");
                        format_mileage_detail(distance, unit_rate, amount_cents)
                    } else if !json_str(expense, "notes").is_empty() {
                        json_str(expense, "notes").to_string()
                    } else if type_key == "MEAL" {
                        "Frais repas forfaitaires".to_string()
                    } else {
                        "—".to_string()
                    };
                    expense_lines.push(ExpenseLine {
                        date: format_iso_date_fr(date),
                        label,
                        detail,
                        amount_cents,
                    });
                }
            }
        }
    }
    if !saw_meal && mission_meal_total_cents > 0 {
        expense_lines.push(ExpenseLine {
            date: format_iso_date_fr(mission_date_debut),
            label: "Repas".to_string(),
            detail: "Frais repas forfaitaires".to_string(),
            amount_cents: mission_meal_total_cents,
        });
    }
    if !saw_mileage && mission_mileage_total_cents > 0 {
        expense_lines.push(ExpenseLine {
            date: format_iso_date_fr(mission_date_debut),
            label: "Déplacement".to_string(),
            detail: format_mileage_detail(
                mission.map(|item| json_f64(item, "mileageKm")).unwrap_or(0.0),
                mission.map(|item| json_i64(item, "mileageRateCents")).unwrap_or(0),
                mission_mileage_total_cents,
            ),
            amount_cents: mission_mileage_total_cents,
        });
    }
    expense_lines.retain(|line| line.amount_cents > 0);
    if expense_lines.is_empty() {
        expense_lines.push(ExpenseLine {
            date: "—".to_string(),
            label: "Frais".to_string(),
            detail: "Aucun frais facturé.".to_string(),
            amount_cents: 0,
        });
    }

    let fee_subtotal_cents: i64 = expense_lines.iter().map(|line| line.amount_cents).sum();
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

    let invoice_ref = format!("{} · {}", invoice_numero, format_money_cents(grand_total_cents));

    log::info!(
        "[PDF] Rendu facture: {}, mission {}, lignes prestations {}, lignes frais {}, total {}",
        invoice_numero,
        mission_code,
        service_lines.len(),
        expense_lines.len(),
        money(grand_total_cents)
    );

    draw_table_header(&current_layer, &fonts, cursor_y);
    cursor_y -= TABLE_HEADER_HEIGHT;

    for (index, line) in service_lines.iter().enumerate() {
        let row_height = if line.dates.len() > 1 { 11.0 } else { 8.2 };
        if cursor_y - row_height < FOOTER_Y + 36.0 {
            current_layer = add_pdf_page(&doc, &mut page_layers);
            cursor_y = PAGE_TOP_Y;
            draw_followup_header(
                &current_layer,
                &fonts,
                invoice_numero,
                pharmacie_nom,
                grand_total_cents,
                cursor_y,
            );
            cursor_y -= 8.0;
            draw_table_header(&current_layer, &fonts, cursor_y);
            cursor_y -= TABLE_HEADER_HEIGHT;
        }
        if index % 2 == 1 {
            draw_rect(
                &current_layer,
                PAGE_MARGIN_X,
                cursor_y,
                CONTENT_WIDTH,
                row_height,
                ROW_LIGHT,
                None,
            );
        }
        let row_text_y = cursor_y - if line.dates.len() > 1 { 6.8 } else { 5.9 };
        draw_text(
            &current_layer,
            format_date_list_fr(&line.dates),
            7.4,
            PAGE_MARGIN_X,
            row_text_y,
            fonts.regular,
            ink,
        );
        draw_text(
            &current_layer,
            truncate_chars(&line.description, 38),
            7.4,
            42.0,
            row_text_y,
            fonts.regular,
            ink,
        );
        draw_text_right(
            &current_layer,
            format_hours(line.hours),
            7.4,
            145.0,
            row_text_y,
            fonts.regular,
            ink,
        );
        draw_text_right(
            &current_layer,
            money(line.rate_cents),
            7.4,
            171.0,
            row_text_y,
            fonts.regular,
            ink,
        );
        draw_text_right(
            &current_layer,
            money(line.amount_cents),
            7.4,
            PAGE_WIDTH - PAGE_MARGIN_X,
            row_text_y,
            fonts.bold,
            ink,
        );
        draw_line(
            &current_layer,
            PAGE_MARGIN_X,
            cursor_y - row_height,
            PAGE_WIDTH - PAGE_MARGIN_X,
            cursor_y - row_height,
            light_border,
            0.1,
        );
        cursor_y -= row_height;
    }

    if !expense_lines.is_empty() {
        cursor_y -= 2.0;
        if cursor_y - 7.8 < FOOTER_Y + 36.0 {
            current_layer = add_pdf_page(&doc, &mut page_layers);
            cursor_y = PAGE_TOP_Y;
            draw_followup_header(
                &current_layer,
                &fonts,
                invoice_numero,
                pharmacie_nom,
                grand_total_cents,
                cursor_y,
            );
            cursor_y -= 8.0;
            draw_table_header(&current_layer, &fonts, cursor_y);
            cursor_y -= TABLE_HEADER_HEIGHT;
        }
        draw_text(
            &current_layer,
            "Frais",
            9.0,
            PAGE_MARGIN_X,
            cursor_y,
            fonts.bold,
            BLUE,
        );
        cursor_y -= 6.0;
        for (index, line) in expense_lines.iter().enumerate() {
            let row_height = 7.6;
            if cursor_y - row_height < FOOTER_Y + 34.0 {
                current_layer = add_pdf_page(&doc, &mut page_layers);
                cursor_y = PAGE_TOP_Y;
                draw_followup_header(
                    &current_layer,
                    &fonts,
                    invoice_numero,
                    pharmacie_nom,
                    grand_total_cents,
                    cursor_y,
                );
                cursor_y -= 8.0;
                draw_table_header(&current_layer, &fonts, cursor_y);
                cursor_y -= TABLE_HEADER_HEIGHT;
                draw_text(
                    &current_layer,
                    "Frais",
                    9.0,
                    PAGE_MARGIN_X,
                    cursor_y,
                    fonts.bold,
                    BLUE,
                );
                cursor_y -= 6.0;
            }
            if index % 2 == 1 {
                draw_rect(
                    &current_layer,
                    PAGE_MARGIN_X,
                    cursor_y,
                    CONTENT_WIDTH,
                    row_height,
                    ROW_LIGHT,
                    None,
                );
            }
            let row_text_y = cursor_y - 5.7;
            draw_text(
                &current_layer,
                line.date.clone(),
                7.2,
                PAGE_MARGIN_X,
                row_text_y,
                fonts.regular,
                ink,
            );
            draw_text(
                &current_layer,
                truncate_chars(&line.label, 18),
                7.2,
                42.0,
                row_text_y,
                fonts.regular,
                ink,
            );
            draw_text(
                &current_layer,
                truncate_chars(&line.detail, 42),
                7.1,
                76.0,
                row_text_y,
                fonts.regular,
                muted,
            );
            draw_text_right(
                &current_layer,
                money(line.amount_cents),
                7.2,
                PAGE_WIDTH - PAGE_MARGIN_X,
                row_text_y,
                fonts.bold,
                ink,
            );
            draw_line(
                &current_layer,
                PAGE_MARGIN_X,
                cursor_y - row_height,
                PAGE_WIDTH - PAGE_MARGIN_X,
                cursor_y - row_height,
                light_border,
                0.1,
            );
            cursor_y -= row_height;
        }
    }

    let payment_lines: Vec<String> = match invoice_status {
        "PAID" => vec![
            format!(
                "Facture acquittée le {}.",
                if json_str(&invoice, "paidAt").is_empty() {
                    invoice_date.to_string()
                } else {
                    json_str(&invoice, "paidAt").to_string()
                }
            ),
            format!("Référence : {}", invoice_numero),
        ],
        "VOIDED" => vec![format!("Référence : {}", invoice_numero)],
        _ => vec![
            format!("Paiement exigible au plus tard le {}.", invoice_due_date),
            "Paiement par virement dans les 30 jours.".to_string(),
            format!("Référence à indiquer : {}.", invoice_numero),
        ],
    };
    let payment_note = if collects_taxes {
        "TPS/TVQ calculées selon les taux applicables.".to_string()
    } else {
        invoice
            .get("smallSupplierMention")
            .and_then(|value| value.as_str())
            .filter(|value| !value.is_empty())
            .map(|value| value.to_string())
            .unwrap_or_else(|| {
                "Petit fournisseur : TPS/TVQ non perçues, sous réserve de votre situation fiscale.".to_string()
            })
    };
    let payment_block_height = 8.5
        + (payment_lines.len() as f64 * 4.6)
        + 5.0
        + 8.5;
    let totals_block_height = 6.2 * 5.0 + 12.0 + payment_block_height;
    if cursor_y - totals_block_height < FOOTER_Y + 8.0 {
        current_layer = add_pdf_page(&doc, &mut page_layers);
        cursor_y = PAGE_TOP_Y;
        draw_followup_header(
            &current_layer,
            &fonts,
            invoice_numero,
            pharmacie_nom,
            grand_total_cents,
            cursor_y,
        );
        cursor_y -= 12.0;
    }

    let totals_w = 88.0;
    let totals_x = PAGE_WIDTH - PAGE_MARGIN_X - totals_w;
    let total_value_right = PAGE_WIDTH - PAGE_MARGIN_X;
    draw_rect(
        &current_layer,
        totals_x,
        cursor_y + 2.0,
        totals_w,
        33.0,
        (0.992, 0.994, 0.997),
        Some(light_border),
    );
    let mut totals_line_y = cursor_y - 2.0;
    for (label, value) in [
        ("Sous-total prestations", money(service_subtotal_cents)),
        ("Frais facturés", money(fee_subtotal_cents)),
        ("TPS", money(gst_cents)),
        ("TVQ", money(qst_cents)),
    ] {
        draw_text(
            &current_layer,
            label,
            8.3,
            totals_x + 3.0,
            totals_line_y,
            fonts.regular,
            muted,
        );
        draw_text_right(
            &current_layer,
            value,
            8.3,
            total_value_right - 3.0,
            totals_line_y,
            fonts.regular,
            ink,
        );
        totals_line_y -= 5.4;
    }
    draw_line(
        &current_layer,
        totals_x + 3.0,
        totals_line_y + 1.8,
        total_value_right - 3.0,
        totals_line_y + 1.8,
        BLUE,
        0.7,
    );
    draw_text(
        &current_layer,
        "TOTAL À PAYER",
        13.5,
        totals_x + 3.0,
        totals_line_y - 6.0,
        fonts.bold,
        BLUE,
    );
    draw_text_right(
        &current_layer,
        money(grand_total_cents),
        15.0,
        total_value_right - 3.0,
        totals_line_y - 6.0,
        fonts.bold,
        BLUE,
    );
    draw_text(
        &current_layer,
        payment_note,
        7.3,
        PAGE_MARGIN_X,
        totals_line_y - 11.0,
        fonts.regular,
        muted,
    );

    let payment_box_top = (totals_line_y - 18.0).max(FOOTER_Y + 26.0);
    draw_text(
        &current_layer,
        "MODALITÉS DE PAIEMENT",
        8.6,
        PAGE_MARGIN_X,
        payment_box_top,
        fonts.bold,
        BLUE,
    );
    let mut payment_y = payment_box_top - 5.2;
    for line in payment_lines {
        draw_text(
            &current_layer,
            line,
            7.8,
            PAGE_MARGIN_X,
            payment_y,
            fonts.regular,
            muted,
        );
        payment_y -= 4.6;
    }
    draw_text_right(
        &current_layer,
        "Merci de votre confiance.",
        10.0,
        PAGE_WIDTH - PAGE_MARGIN_X,
        payment_box_top,
        fonts.bold,
        ink,
    );

    let page_total = page_layers.len();
    for (index, layer) in page_layers.iter().enumerate() {
        draw_footer(layer, &fonts, collects_taxes, &invoice_ref, muted, index + 1, page_total);
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
        assert_eq!(format_money_cents(123456), format!("1\u{202f}234,56 $"));
        assert_eq!(format_hours(8.0), "8,00 h");
        assert_eq!(format_km(36.5), "36,5 km");
        assert_eq!(format_rate_cents_per_km(61), "0,61 $ / km");
        assert_eq!(format_date_span_fr("2026-06-18", "2026-06-25"), "18 au 25 juin 2026");
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
