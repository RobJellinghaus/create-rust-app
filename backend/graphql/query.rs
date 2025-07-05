use async_graphql::{Context, Object, Result};
use create_rust_app::auth::Auth;
use create_rust_app::Database;
use crate::models::todo::{Todo, TodoFilter, PaginationResult};

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    async fn ping(&self, ctx: &Context<'_>) -> String {
        let auth = ctx.data::<Auth>().unwrap();
        format!("Hello user#{}", auth.user_id)
    }

    async fn todos(&self, ctx: &Context<'_>, page: Option<i64>, page_size: Option<i64>) -> Result<PaginationResult<Todo>> {
        let db = ctx.data::<Database>().unwrap();
        let mut con = db.get_connection().unwrap();
        
        let page = page.unwrap_or(0);
        let page_size = page_size.unwrap_or(10);
        
        Todo::paginate(&mut con, page, page_size, TodoFilter::default())
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))
    }

    async fn todo(&self, ctx: &Context<'_>, id: i32) -> Result<Todo> {
        let db = ctx.data::<Database>().unwrap();
        let mut con = db.get_connection().unwrap();
        
        Todo::read(&mut con, id)
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))
    }
}