use async_graphql::{Context, Object, Result};
use create_rust_app::Database;
use crate::models::todo::{Todo, CreateTodo, UpdateTodo};

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    async fn create_todo(&self, ctx: &Context<'_>, text: String) -> Result<Todo> {
        let db = ctx.data::<Database>().unwrap();
        let mut con = db.get_connection().unwrap();
        
        let new_todo = CreateTodo { text };
        Todo::create(&mut con, &new_todo)
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))
    }

    async fn update_todo(&self, ctx: &Context<'_>, id: i32, text: Option<String>) -> Result<Todo> {
        let db = ctx.data::<Database>().unwrap();
        let mut con = db.get_connection().unwrap();
        
        let update_todo = UpdateTodo { text, ..Default::default() };
        Todo::update(&mut con, id, &update_todo)
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))
    }

    async fn delete_todo(&self, ctx: &Context<'_>, id: i32) -> Result<bool> {
        let db = ctx.data::<Database>().unwrap();
        let mut con = db.get_connection().unwrap();
        
        Todo::delete(&mut con, id)
            .map(|count| count > 0)
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))
    }
}
