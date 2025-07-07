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

    async fn update_todo(&self, ctx: &Context<'_>, id: i32, text: Option<String>) -> Result<Todo> {
        let mut con = get_connection(ctx)?;
        
        let update_todo = UpdateTodo { text, ..Default::default() };
        Todo::update(&mut con, id, &update_todo)
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))
    }

    async fn delete_todo(&self, ctx: &Context<'_>, id: i32) -> Result<bool> {
        let mut con = get_connection(ctx)?;
        
        Todo::delete(&mut con, id)
            .map(|count| count > 0)
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))
    }
}
