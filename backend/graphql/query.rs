use async_graphql::{Context, Object, Result};
use create_rust_app::auth::Auth;
use create_rust_app::Database;
use crate::models::todo::{Todo, TodoFilter, PaginationResult, ConnectionType};
use crate::models::supplier::{Supplier, SupplierFilter};

fn get_connection(ctx: &Context<'_>) -> Result<ConnectionType> {
    let db = ctx.data::<Database>()?;
    db.get_connection().map_err(|e| async_graphql::Error::new(format!("Connection error: {}", e)))
}

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    async fn ping(&self, ctx: &Context<'_>) -> String {
        let auth = ctx.data::<Auth>().unwrap();
        format!("Hello user#{}", auth.user_id)
    }

    async fn todos(&self, ctx: &Context<'_>, page: Option<i64>, page_size: Option<i64>) -> Result<PaginationResult<Todo>> {
        let mut con = get_connection(ctx)?;
        
        let page = page.unwrap_or(0);
        let page_size = page_size.unwrap_or(10);
        
        Todo::paginate(&mut con, page, page_size, TodoFilter::default())
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))
    }

    async fn todo(&self, ctx: &Context<'_>, id: async_graphql::ID) -> Result<Todo> {
        let mut con = get_connection(ctx)?;
        
        let id_int: i32 = id.parse()
            .map_err(|_| async_graphql::Error::new("Invalid ID format"))?;
        
        Todo::read(&mut con, id_int)
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))
    }

    async fn suppliers(&self, ctx: &Context<'_>, page: Option<i64>, page_size: Option<i64>) -> Result<PaginationResult<Supplier>> {
        let mut con = get_connection(ctx)?;
        
        let page = page.unwrap_or(0);
        let page_size = page_size.unwrap_or(10);
        
        Supplier::paginate(&mut con, page, page_size, SupplierFilter::default())
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))
    }

    async fn supplier(&self, ctx: &Context<'_>, id: async_graphql::ID) -> Result<Supplier> {
        let mut con = get_connection(ctx)?;
        
        let id_int: i32 = id.parse()
            .map_err(|_| async_graphql::Error::new("Invalid ID format"))?;
        
        Supplier::read(&mut con, id_int)
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))
    }
}