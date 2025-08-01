use actix_web::{post, get, HttpResponse, web::{Data, Json, Query}};
use actix_web_lab::sse::{self, Sse};
use ollama_rs::{Ollama, generation::completion::request::GenerationRequest, Coordinator, CoordinatorStreamEvent, generation::tools::Tool, history::ChatHistory, generation::chat::ChatMessage};
use tokio_stream::StreamExt;
use futures_util::stream::Stream;
use tracing::debug;
use std::pin::Pin;
use crate::models::suppliers::Suppliers;
use create_rust_app::Database;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const MODEL: &str = "mistral-nemo";

pub struct ChatService {
    ollama: Ollama,
    model_name: String,
    context_window_size: Option<usize>,
}

impl ChatService {
    pub fn new() -> Self {
        Self {
            ollama: Ollama::new("http://localhost".to_string(), 11434),
            model_name: MODEL.to_string(),
            context_window_size: None,
        }
    }

    pub async fn initialize(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        self.context_window_size = self.get_context_window_size().await.ok();
        Ok(())
    }

    async fn get_context_window_size(&self) -> Result<usize, Box<dyn std::error::Error>> {
        match self.ollama.show_model_info(self.model_name.clone()).await {
            Ok(model_info) => {
                // Parse modelfile for num_ctx parameter
                for line in model_info.modelfile.lines() {
                    if line.starts_with("PARAMETER num_ctx") {
                        if let Some(value) = line.split_whitespace().nth(2) {
                            if let Ok(ctx_size) = value.parse::<usize>() {
                                debug!("Found context window size in modelfile: {}", ctx_size);
                                return Ok(ctx_size);
                            }
                        }
                    }
                }
                
                // Parse parameters string for num_ctx
                for line in model_info.parameters.lines() {
                    if line.contains("num_ctx") {
                        if let Some(value) = line.split_whitespace().last() {
                            if let Ok(ctx_size) = value.parse::<usize>() {
                                debug!("Found context window size in parameters: {}", ctx_size);
                                return Ok(ctx_size);
                            }
                        }
                    }
                }
                
                // Default context window for mistral models
                let default_size = 32768;
                debug!("Using default context window size: {}", default_size);
                Ok(default_size)
            },
            Err(e) => {
                debug!("Failed to get model info: {}, using default context size", e);
                Ok(32768) // Default context window
            }
        }
    }

    fn estimate_token_count(&self, text: &str) -> usize {
        // Rough estimation: ~4 characters per token for most models
        // This is approximate but sufficient for context management
        (text.len() + 3) / 4
    }

    fn truncate_history_to_fit_context(&self, history: &[ChatMessageRequest], system_prompt: &str, user_message: &str) -> Vec<ChatMessageRequest> {
        let context_limit = self.context_window_size.unwrap_or(32768);
        let system_tokens = self.estimate_token_count(system_prompt);
        let user_tokens = self.estimate_token_count(user_message);
        let reserved_tokens = 1000; // Reserve space for response
        
        let available_tokens = context_limit.saturating_sub(system_tokens + user_tokens + reserved_tokens);
        
        debug!("Context management: limit={}, system={}, user={}, reserved={}, available={}", 
               context_limit, system_tokens, user_tokens, reserved_tokens, available_tokens);
        
        let mut truncated_history = Vec::new();
        let mut total_tokens = 0;
        
        // Include history from most recent backwards until we hit the limit
        for message in history.iter().rev() {
            let message_tokens = self.estimate_token_count(&message.content);
            if total_tokens + message_tokens > available_tokens {
                break;
            }
            total_tokens += message_tokens;
            truncated_history.insert(0, message.clone());
        }
        
        debug!("Truncated history to {} messages ({} tokens)", truncated_history.len(), total_tokens);
        truncated_history
    }


    pub async fn chat_with_suppliers_stream_with_tools(
        &self,
        user_message: String,
        history: Option<Vec<ChatMessageRequest>>,
        db: &Database,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<String, Box<dyn std::error::Error + Send>>> + Send>>, Box<dyn std::error::Error>> {
        use async_stream::stream;
        
        // 1. Fetch all current suppliers
        let suppliers = self.get_all_suppliers(db).await?;
        
        // 2. Build enhanced context with full supplier addresses
        let context = self.build_enhanced_supplier_context(&suppliers);
        
        // 3. Create enhanced system message
        let system_message = ChatMessage::system(format!(
            r#"You are a procurement expert AI assistant with access to geocoding and distance calculation tools. 
You help users make informed supplier decisions based on location, logistics, cost optimization, and supply chain management.

CURRENT SUPPLIER DATABASE:
{}

CAPABILITIES:
- Use geocode_location(location) to get coordinates for any address or city
- Use calculate_distance(lat1, lng1, lat2, lng2) to get precise distances
- Analyze geographic proximity for shipping costs and delivery times
- Provide practical procurement recommendations

INSTRUCTIONS:
- When users ask about supplier locations or distances, use your tools to provide precise calculations
- Consider geographical proximity as a key factor in supplier selection  
- Help users choose the best suppliers based on their location-based needs
- Be concise but thorough in your recommendations
- If asked about suppliers not in the database, inform the user they're not currently available"#,
            context
        ));
        
        // 4. Build initial conversation with history
        let mut initial_messages = vec![system_message];
        if let Some(hist) = history {
            // Convert ChatMessageRequest to ChatMessage
            for msg in hist {
                let chat_msg = match msg.role.as_str() {
                    "user" => ChatMessage::user(msg.content),
                    "assistant" => ChatMessage::assistant(msg.content),
                    _ => ChatMessage::user(msg.content), // Default to user
                };
                initial_messages.push(chat_msg);
            }
        }
        initial_messages.push(ChatMessage::user(user_message));
        
        // 5. Create multi-stream wrapper that handles tool-calling rounds automatically
        let owned_stream = stream! {
            let mut coordinator = match setup_coordinator_with_geocoding().await {
                Ok(coord) => coord,
                Err(e) => {
                    let error_msg = format!("Failed to setup coordinator: {}", e);
                    yield Err(Box::new(std::io::Error::new(std::io::ErrorKind::Other, error_msg)) as Box<dyn std::error::Error + Send>);
                    return;
                }
            };
            
            let mut messages = initial_messages.clone();
            let mut round = 1;
            
            loop {
                debug!("Starting streaming round {}", round);
                
                let coordinator_stream = match coordinator.chat_stream(messages.clone()).await {
                    Ok(stream) => stream,
                    Err(e) => {
                        let error_msg = format!("Failed to start chat stream (round {}): {}", round, e);
                        yield Err(Box::new(std::io::Error::new(std::io::ErrorKind::Other, error_msg)) as Box<dyn std::error::Error + Send>);
                        return;
                    }
                };
                
                let mut coordinator_stream = Box::pin(coordinator_stream);
                let mut stream_completed = false;
                let mut tool_completed = false;
                
                while let Some(event) = coordinator_stream.next().await {
                    let result = match event {
                        CoordinatorStreamEvent::ContentChunk(content) => {
                            debug!("Round {} - Content chunk: {}", round, content);
                            Ok(content)
                        },
                        CoordinatorStreamEvent::ToolCallStarted { name, args } => {
                            debug!("Round {} - Tool call started: {} with args: {:?}", round, name, args);
                            let args_display = if args.is_object() && !args.as_object().unwrap().is_empty() {
                                format!(" with args: {}", args)
                            } else {
                                String::new()
                            };
                            match name.as_str() {
                                "geocode_location" => Ok(format!("\n🔍 Looking up location coordinates{}\n", args_display)),
                                "calculate_distance" => Ok(format!("\n📏 Calculating distance{}\n", args_display)),
                                _ => Ok(format!("\n⚙️ Running {}{}\n", name, args_display)),
                            }
                        },
                        CoordinatorStreamEvent::ToolCallCompleted { name, result } => {
                            debug!("Round {} - Tool call completed: {} -> {}", round, name, result);
                            tool_completed = true; // Mark that tools were used
                            Ok(format!("✅ {} completed: {}\n", name, result))
                        },
                        CoordinatorStreamEvent::FinalContentChunk(content) => {
                            debug!("Round {} - Final content chunk: {}", round, content);
                            Ok(content)
                        },
                        CoordinatorStreamEvent::Done => {
                            debug!("Round {} - Coordinator stream done", round);
                            stream_completed = true;
                            break;
                        },
                        CoordinatorStreamEvent::Error(err) => {
                            debug!("Round {} - Coordinator stream error: {}", round, err);
                            Err(Box::new(std::io::Error::new(std::io::ErrorKind::Other, err)) as Box<dyn std::error::Error + Send>)
                        },
                    };
                    yield result;
                }
                
                // Drop the stream to release the mutable borrow before accessing history
                drop(coordinator_stream);
                
                if stream_completed && tool_completed {
                    // Tools were used, continue with another stream that includes tool results
                    debug!("Round {} complete with tools used, starting round {}", round, round + 1);
                    let history = coordinator.history().clone();
                    messages = initial_messages.clone();
                    messages.extend(history);
                    round += 1;
                    continue; // Loop back for another streaming request
                } else {
                    // No tools used or stream failed, we're done
                    debug!("Round {} complete. Tools used: {}, conversation complete after {} rounds", round, tool_completed, round);
                    break;
                }
            }
        };
        
        Ok(Box::pin(owned_stream))
    }

    async fn get_all_suppliers(&self, db: &Database) -> Result<Vec<Suppliers>, Box<dyn std::error::Error>> {
        use crate::models::suppliers::*;
        let mut conn = db.get_connection()?;
        let result = Suppliers::paginate(&mut conn, 0, 1000, SuppliersFilter::default())?;
        Ok(result.items)
    }

    fn build_enhanced_supplier_context(&self, suppliers: &[Suppliers]) -> String {
        if suppliers.is_empty() {
            return "Currently, there are no suppliers in the system.".to_string();
        }

        let mut context = String::from("Current Supplier Database:\n\n");
        
        for (index, supplier) in suppliers.iter().enumerate() {
            context.push_str(&format!(
                "{}. {}\n   Full Address: {}, {}, {} {}, {}\n   Contact: {} ({})\n   Phone: {}\n   Website: {}\n\n",
                index + 1,
                supplier.name,
                supplier.address,
                supplier.city,
                supplier.state,
                supplier.zip_code,
                supplier.country,
                supplier.contact_name,
                supplier.contact_email,
                supplier.contact_phone,
                supplier.website.as_deref().unwrap_or("Not provided")
            ));
        }
        
        context
    }

}

#[tsync::tsync]
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct ChatMessageRequest {
    pub role: String,
    pub content: String,
}

#[tsync::tsync]
#[derive(serde::Deserialize)]
pub struct ChatRequest {
    pub message: String,
    pub history: Option<Vec<ChatMessageRequest>>,
}

#[tsync::tsync] 
#[derive(serde::Deserialize)]
pub struct ChatStreamRequest {
    pub message: String,
    pub history: Option<Vec<ChatMessageRequest>>,
}

#[tsync::tsync]
#[derive(serde::Serialize)]
pub struct ChatResponse {
    pub response: String,
}

#[derive(Deserialize)]
struct NominatimResult {
    lat: String,
    lon: String,
    display_name: String,
}


/// Get latitude and longitude coordinates for a location
#[ollama_rs::function]
async fn geocode_location(location: String) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::builder()
        .user_agent("Procuretoy-Chatbot/1.0")
        .timeout(std::time::Duration::from_secs(10))
        .build()?;
        
    let encoded_location = urlencoding::encode(&location);
    let url = format!(
        "https://nominatim.openstreetmap.org/search?q={}&format=json&limit=1&addressdetails=1",
        encoded_location
    );
    
    debug!("Geocoding request: {}", url);
    
    let response = client.get(&url).send().await?;
    let results: Vec<NominatimResult> = response.json().await?;
    
    match results.first() {
        Some(result) => {
            debug!("Geocoding success: {} -> {},{}", location, result.lat, result.lon);
            Ok(format!("Coordinates for '{}': {},{} ({})", 
                location, result.lat, result.lon, result.display_name))
        }
        None => {
            debug!("Geocoding failed for: {}", location);
            Ok(format!("Could not find coordinates for: {}", location))
        }
    }
}

/// Calculate distance between two coordinate points in kilometers and miles
#[ollama_rs::function]
async fn calculate_distance(
    lat1: f64, lng1: f64, lat2: f64, lng2: f64
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    const EARTH_RADIUS_KM: f64 = 6371.0;
    
    let lat1_rad = lat1.to_radians();
    let lat2_rad = lat2.to_radians();
    let delta_lat = (lat2 - lat1).to_radians();
    let delta_lng = (lng2 - lng1).to_radians();
    
    let a = (delta_lat / 2.0).sin().powi(2) +
            lat1_rad.cos() * lat2_rad.cos() * (delta_lng / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    let distance_km = EARTH_RADIUS_KM * c;
    let distance_miles = distance_km * 0.621371;
    
    debug!("Distance calculated: {:.1} km ({:.1} miles)", distance_km, distance_miles);
    Ok(format!("Distance: {:.1} km ({:.1} miles)", distance_km, distance_miles))
}

pub async fn setup_coordinator_with_geocoding() -> Result<Coordinator<Vec<ChatMessage>>, Box<dyn std::error::Error + Send + Sync>> {
    let ollama = Ollama::new("http://localhost".to_string(), 11434);
    let coordinator = Coordinator::new(ollama, MODEL.to_string(), Vec::new())
        .add_tool(geocode_location)
        .add_tool(calculate_distance)
        .debug(true);
    Ok(coordinator)
}

#[post("/stream")]
async fn chat_stream(
    db: Data<Database>,
    Json(request): Json<ChatStreamRequest>,
) -> Sse<impl Stream<Item = Result<sse::Event, actix_web::Error>>> {
    let mut chat_service = ChatService::new();
    if let Err(e) = chat_service.initialize().await {
        eprintln!("Failed to initialize chat service: {}", e);
    }
    
    let result_stream = match chat_service.chat_with_suppliers_stream_with_tools(request.message, request.history, &db).await {
        Ok(stream) => {
            use futures_util::stream::StreamExt as FuturesStreamExt;
            
            // Convert to proper SSE events
            let mapped_stream = FuturesStreamExt::map(stream, |result| {
                match result {
                    Ok(text) => {
                        if text.is_empty() {
                            // Skip empty chunks
                            Ok(sse::Event::Data(sse::Data::new("")))
                        } else {
                            // Send text as SSE data event
                            let json_text = serde_json::to_string(&text).unwrap_or_else(|_| "\"\"".to_string());
                            Ok(sse::Event::Data(sse::Data::new(json_text)))
                        }
                    },
                    Err(e) => {
                        eprintln!("Stream error: {}", e);
                        let error_msg = serde_json::to_string(&format!("Error: {}", e)).unwrap_or_else(|_| "\"Error occurred\"".to_string());
                        Ok(sse::Event::Data(sse::Data::new(error_msg).event("error")))
                    }
                }
            });
            
            let sse_stream = FuturesStreamExt::chain(mapped_stream, futures_util::stream::once(async {
                // Send completion event
                Ok(sse::Event::Data(sse::Data::new("").event("end")))
            }));
            
            Box::pin(sse_stream) as Pin<Box<dyn Stream<Item = Result<sse::Event, actix_web::Error>> + Send>>
        },
        Err(e) => {
            eprintln!("Chat stream error: {}", e);
            let error_stream = futures_util::stream::once(async move {
                let error_msg = "Sorry, I'm having trouble processing your request right now.";
                Ok(sse::Event::Data(sse::Data::new(error_msg).event("error")))
            });
            Box::pin(error_stream) as Pin<Box<dyn Stream<Item = Result<sse::Event, actix_web::Error>> + Send>>
        }
    };
    
    Sse::from_stream(result_stream)
}

pub fn endpoints(scope: actix_web::Scope) -> actix_web::Scope {
    scope
        .service(chat_stream)
}