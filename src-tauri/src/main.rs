// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::io::BufWriter;
use tauri::{Manager, path::BaseDirectory};

// ============================================================================
// Constantes
// ============================================================================

const APP_DATA_DIR: &str = "Pharmfact";
const STATE_FILE: &str = "app-state.json";

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
    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Erreur création répertoire: {}", e))?;
    
    let state_path = data_dir.join(STATE_FILE);
    
    if !state_path.exists() {
        return Ok("{}".to_string());
    }
    
    fs::read_to_string(&state_path)
        .map_err(|e| format!("Erreur de lecture: {}", e))
}

#[tauri::command]
async fn save_state(state: String, app: tauri::AppHandle) -> Result<(), String> {
    let app_dir = app
        .path()
        .resolve("", BaseDirectory::AppData)
        .map_err(|e| format!("Erreur résolution chemin: {}", e))?;
    
    let data_dir = app_dir.join(APP_DATA_DIR);
    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Erreur création répertoire: {}", e))?;
    
    let state_path = data_dir.join(STATE_FILE);
    fs::write(&state_path, state)
        .map_err(|e| format!("Erreur d'écriture: {}", e))
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
        fs::remove_file(&state_path)
            .map_err(|e| format!("Erreur de suppression: {}", e))?;
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
    fs::create_dir_all(&download_dir)
        .map_err(|e| format!("Erreur création répertoire: {}", e))?;
    
    let file_path = download_dir.join(&filename);
    fs::write(&file_path, &data)
        .map_err(|e| format!("Erreur d'écriture: {}", e))?;
    
    Ok(())
}

// Note: open_file et show_confirm_dialog sont gérés côté frontend avec @tauri-apps/api"

#[tauri::command]
async fn read_file_text(path: String, _app: tauri::AppHandle) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("Erreur de lecture: {}", e))
}

// ============================================================================
// Commande de génération PDF - Version corrigée
// ============================================================================

#[tauri::command]
async fn generate_invoice_pdf(
    invoice: serde_json::Value,
    _state_json: String, // Réservé pour une utilisation future avec les paramètres de l'app
) -> Result<String, String> {
    // Log détaillé pour debug
    log::info!("[PDF] Commande generate_invoice_pdf appelée");
    log::info!("[PDF] Invoice reçu: {}", invoice);
    
    // Extraire les informations de la facture
    let invoice_numero = invoice.get("numero")
        .and_then(|v| v.as_str())
        .unwrap_or("FACTURE");
    
    log::info!("[PDF] Numéro de facture: {}", invoice_numero);
    
    let invoice_date = invoice.get("dateFacture")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    
    let client_nom = invoice.get("pharmacieNom")
        .and_then(|v| v.as_str())
        .unwrap_or("Client");
    
    // Essayer d'extraire plus d'informations de la facture
    let client_adresse = invoice.get("pharmacieAdresse")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    
    let pharmacien_nom = invoice.get("pharmacienNom")
        .and_then(|v| v.as_str())
        .unwrap_or("Pharmacien");
    
    let total_amount = invoice.get("amountCents")
        .and_then(|v| v.as_u64())
        .map(|cents| format!("{:.2} $", cents as f64 / 100.0))
        .unwrap_or("0.00 $".to_string());
    
    log::info!("[PDF] Date: {}, Client: {}, Adresse: {}, Pharmacien: {}, Montant: {}", 
              invoice_date, client_nom, client_adresse, pharmacien_nom, total_amount);
    
    // Générer un PDF simple avec la bibliothèque printpdf
    use printpdf::*;
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    
    // Créer un nouveau document PDF
    let (doc, page1, layer1) = PdfDocument::new("Facture_Pharmfact", Mm(210.0), Mm(297.0), "Layer 1");
    let current_layer = doc.get_page(page1).get_layer(layer1);
    
    // Ajouter du texte
    let font = doc.add_builtin_font(BuiltinFont::Helvetica).unwrap();
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold).unwrap();
    
    // En-tête
    current_layer.use_text("FACTURE", 24.0, Mm(50.0), Mm(270.0), &font_bold);
    current_layer.use_text(format!("N°: {}", invoice_numero), 16.0, Mm(50.0), Mm(250.0), &font);
    current_layer.use_text(format!("Date: {}", invoice_date), 12.0, Mm(50.0), Mm(235.0), &font);
    
    // Informations client
    current_layer.use_text("Client:", 14.0, Mm(50.0), Mm(210.0), &font_bold);
    current_layer.use_text(client_nom.to_string(), 12.0, Mm(50.0), Mm(200.0), &font);
    if !client_adresse.is_empty() {
        current_layer.use_text(client_adresse.to_string(), 10.0, Mm(50.0), Mm(190.0), &font);
    }
    
    // Informations pharmacien
    current_layer.use_text(format!("Pharmacien: {}", pharmacien_nom), 12.0, Mm(50.0), Mm(175.0), &font);
    
    // Montant
    current_layer.use_text(format!("Montant total: {}", total_amount), 16.0, Mm(50.0), Mm(150.0), &font_bold);
    current_layer.use_text("Merci pour votre confiance!", 12.0, Mm(50.0), Mm(130.0), &font);
    
    // Finaliser le PDF
    let mut bytes = Vec::new();
    {
        let mut writer = BufWriter::new(&mut bytes);
        doc.save(&mut writer).map_err(|e| format!("[PDF] Erreur génération PDF: {}", e))?;
    }
    
    // Vérifier que le PDF commence par le header %PDF-
    if bytes.len() < 5 || &bytes[0..4] != b"%PDF" {
        log::error!("[PDF] Buffer PDF invalide: ne commence pas par %PDF- (taille: {} bytes)", bytes.len());
        return Err("Erreur interne: génération PDF échouée".to_string());
    }
    
    log::info!("[PDF] PDF généré avec succès ({} bytes) pour facture {}", bytes.len(), invoice_numero);
    
    // Encoder en base64 pour le retour JSON
    let base64_result = STANDARD.encode(&bytes);
    log::info!("[PDF] Base64 générée, longueur: {}", base64_result.len());
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
            // Fichiers
            download_file,
            read_file_text,
            // PDF
            generate_invoice_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors de l'exécution de l'application Tauri");
}
