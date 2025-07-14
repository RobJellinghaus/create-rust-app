use async_graphql::{Context, Object, Result};
use create_rust_app::Database;
use crate::models::todo::{Todo, CreateTodo, UpdateTodo, ConnectionType};

fn get_connection(ctx: &Context<'_>) -> Result<ConnectionType> {
    let db = ctx.data::<Database>()?;
    db.get_connection().map_err(|e| async_graphql::Error::new(format!("Connection error: {}", e)))
}

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    async fn create_todo(&self, ctx: &Context<'_>, text: String) -> Result<Todo> {
        let mut con = get_connection(ctx)?;
        
        let new_todo = CreateTodo { text };
        Todo::create(&mut con, &new_todo)
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))
    }

    async fn update_todo(&self, ctx: &Context<'_>, id: async_graphql::ID, text: Option<String>) -> Result<Todo> {
        let mut con = get_connection(ctx)?;
        
        let id_int: i32 = id.parse()
            .map_err(|_| async_graphql::Error::new("Invalid ID format"))?;
        
        let update_todo = UpdateTodo { text, ..Default::default() };
        Todo::update(&mut con, id_int, &update_todo)
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))
    }

    async fn delete_todo(&self, ctx: &Context<'_>, id: async_graphql::ID) -> Result<bool> {
        let mut con = get_connection(ctx)?;
        
        let id_int: i32 = id.parse()
            .map_err(|_| async_graphql::Error::new("Invalid ID format"))?;
        
        Todo::delete(&mut con, id_int)
            .map(|count| count > 0)
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))
    }
}
