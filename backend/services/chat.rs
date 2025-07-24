use actix_web::{post, get, HttpResponse, web::{Data, Json, Query}};
use actix_web_lab::sse::{self, Sse};
use ollama_rs::{Ollama, generation::completion::request::GenerationRequest};
use tokio_stream::StreamExt;
use futures_util::stream::Stream;
use tracing::debug;
use std::pin::Pin;
use crate::models::suppliers::Suppliers;
use create_rust_app::Database;

pub struct ChatService {
    ollama: Ollama,
    model_name: String,
    context_window_size: Option<usize>,
}

impl ChatService {
    pub fn new() -> Self {
        Self {
            ollama: Ollama::new("http://localhost".to_string(), 11434),
            model_name: "mistral-small3.2:24b".to_string(),
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

    fn truncate_history_to_fit_context(&self, history: &[ChatMessage], system_prompt: &str, user_message: &str) -> Vec<ChatMessage> {
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

    pub async fn chat_with_suppliers(
        &self,
        user_message: String,
        history: Option<Vec<ChatMessage>>,
        db: &Database,
    ) -> Result<String, Box<dyn std::error::Error>> {
        // 1. Fetch all current suppliers
        let suppliers = self.get_all_suppliers(db).await?;
        
        // 2. Build context with supplier data
        let context = self.build_supplier_context(&suppliers);
        
        // 3. Create procurement expert prompt with history
        let full_prompt = self.build_prompt_with_history(&context, &user_message, &history.unwrap_or_default());
        
        // 4. Send to Ollama
        let request = GenerationRequest::new(self.model_name.clone(), full_prompt);
        let response = self.ollama.generate(request).await?;
        
        Ok(response.response)
    }

    pub async fn chat_with_suppliers_stream(
        &self,
        user_message: String,
        history: Option<Vec<ChatMessage>>,
        db: &Database,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<String, Box<dyn std::error::Error + Send>>> + Send>>, Box<dyn std::error::Error>> {
        // 1. Fetch all current suppliers
        let suppliers = self.get_all_suppliers(db).await?;
        
        // 2. Build context with supplier data
        let context = self.build_supplier_context(&suppliers);
        
        // 3. Create procurement expert prompt with history
        let full_prompt = self.build_prompt_with_history(&context, &user_message, &history.unwrap_or_default());
        
        // 4. Send to Ollama with streaming
        let request = GenerationRequest::new(self.model_name.clone(), full_prompt);
        let stream = self.ollama.generate_stream(request).await?;
        
        // 5. Transform the stream to extract text responses
        let text_stream = stream.map(|result| {
            match result {
                Ok(responses) => {
                    let text = responses.iter()
                        .map(|resp| resp.response.clone())
                        .collect::<Vec<String>>()
                        .join("");

                    debug!("streaming text response: {text}");

                    Ok(text)
                },
                Err(e) => Err(Box::new(e) as Box<dyn std::error::Error + Send>)
            }
        });
        
        Ok(Box::pin(text_stream))
    }

    async fn get_all_suppliers(&self, db: &Database) -> Result<Vec<Suppliers>, Box<dyn std::error::Error>> {
        use crate::models::suppliers::*;
        let mut conn = db.get_connection()?;
        let result = Suppliers::paginate(&mut conn, 0, 1000, SuppliersFilter::default())?;
        Ok(result.items)
    }

    fn build_supplier_context(&self, suppliers: &[Suppliers]) -> String {
        if suppliers.is_empty() {
            return "Currently, there are no suppliers in the system.".to_string();
        }

        let mut context = String::from("Current Supplier Database:\n\n");
        
        for (index, supplier) in suppliers.iter().enumerate() {
            context.push_str(&format!(
                "{}. {}\n   Location: {}, {}, {}, {}\n   Contact: {} ({})\n   Phone: {}\n   Website: {}\n\n",
                index + 1,
                supplier.name,
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

    fn build_prompt_with_history(&self, supplier_context: &str, user_message: &str, history: &[ChatMessage]) -> String {
        let system_prompt = format!(
            r#"You are a procurement expert AI assistant helping users make informed supplier decisions. 
Your expertise includes supplier evaluation, location-based logistics, cost optimization, and supply chain risk management.

CURRENT SUPPLIER DATABASE:
{}

INSTRUCTIONS:
- Help users choose the best suppliers based on their needs
- Consider geographical proximity for shipping costs and delivery times  
- Analyze supplier locations for logistics advantages
- Provide practical procurement advice
- If asked about suppliers not in the database, inform the user they're not currently available
- Be concise but thorough in your recommendations
- Always consider location as a key factor in supplier selection
- Maintain context from previous conversation while staying focused on procurement"#,
            supplier_context
        );
        
        // Truncate history to fit within context window
        let truncated_history = self.truncate_history_to_fit_context(history, &system_prompt, user_message);
        
        let mut full_prompt = system_prompt;
        
        // Add conversation history
        if !truncated_history.is_empty() {
            full_prompt.push_str("\n\nCONVERSATION HISTORY:\n");
            for msg in truncated_history {
                match msg.role.as_str() {
                    "user" => full_prompt.push_str(&format!("USER: {}\n", msg.content)),
                    "assistant" => full_prompt.push_str(&format!("ASSISTANT: {}\n", msg.content)),
                    _ => {}
                }
            }
        }
        
        full_prompt.push_str(&format!("\nUSER: {}\n\nASSISTANT:", user_message));
        full_prompt
    }

    fn build_prompt(&self, supplier_context: &str, user_message: &str) -> String {
        self.build_prompt_with_history(supplier_context, user_message, &[])
    }
}

#[tsync::tsync]
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[tsync::tsync]
#[derive(serde::Deserialize)]
pub struct ChatRequest {
    pub message: String,
    pub history: Option<Vec<ChatMessage>>,
}

#[tsync::tsync] 
#[derive(serde::Deserialize)]
pub struct ChatStreamRequest {
    pub message: String,
    pub history: Option<Vec<ChatMessage>>,
}

#[tsync::tsync]
#[derive(serde::Serialize)]
pub struct ChatResponse {
    pub response: String,
}

#[post("")]
async fn chat(
    db: Data<Database>,
    Json(request): Json<ChatRequest>,
) -> HttpResponse {
    let mut chat_service = ChatService::new();
    if let Err(e) = chat_service.initialize().await {
        eprintln!("Failed to initialize chat service: {}", e);
    }
    
    match chat_service.chat_with_suppliers(request.message, request.history, &db).await {
        Ok(response) => HttpResponse::Ok().json(ChatResponse { response }),
        Err(e) => {
            eprintln!("Chat error: {}", e);
            HttpResponse::InternalServerError().json(ChatResponse {
                response: "Sorry, I'm having trouble processing your request right now. Please try again later.".to_string()
            })
        }
    }
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
    
    let result_stream = match chat_service.chat_with_suppliers_stream(request.message, request.history, &db).await {
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
        .service(chat)
        .service(chat_stream)
}