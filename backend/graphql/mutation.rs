use async_graphql::{Context, Object, Result, InputObject};
use create_rust_app::Database;
use crate::models::todo::{Todo, CreateTodo, UpdateTodo, ConnectionType};
use crate::models::suppliers::{Suppliers, CreateSuppliers, UpdateSuppliers};

fn get_connection(ctx: &Context<'_>) -> Result<ConnectionType> {
    let db = ctx.data::<Database>()?;
    db.get_connection().map_err(|e| async_graphql::Error::new(format!("Connection error: {}", e)))
}

#[derive(InputObject)]
pub struct CreateSupplierInput {
    pub name: String,
    pub address: String,
    pub city: String,
    pub state: String,
    pub zip_code: String,
    pub country: String,
    pub contact_name: String,
    pub contact_email: String,
    pub contact_phone: String,
    pub website: Option<String>,
}

#[derive(InputObject)]
pub struct UpdateSupplierInput {
    pub name: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub contact_name: Option<String>,
    pub contact_email: Option<String>,
    pub contact_phone: Option<String>,
    pub website: Option<String>,
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

    async fn create_supplier(&self, ctx: &Context<'_>, input: CreateSupplierInput) -> Result<Suppliers> {
        let mut con = get_connection(ctx)?;
        
        let new_supplier = CreateSuppliers {
            name: input.name,
            address: input.address,
            city: input.city,
            state: input.state,
            zip_code: input.zip_code,
            country: input.country,
            contact_name: input.contact_name,
            contact_email: input.contact_email,
            contact_phone: input.contact_phone,
            website: input.website,
        };
        
        Suppliers::create(&mut con, &new_supplier)
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))
    }

    async fn update_supplier(&self, ctx: &Context<'_>, id: async_graphql::ID, input: UpdateSupplierInput) -> Result<Suppliers> {
        let mut con = get_connection(ctx)?;
        
        let id_int: i32 = id.parse()
            .map_err(|_| async_graphql::Error::new("Invalid ID format"))?;
        
        let update_supplier = UpdateSuppliers {
            name: input.name,
            address: input.address,
            city: input.city,
            state: input.state,
            zip_code: input.zip_code,
            country: input.country,
            contact_name: input.contact_name,
            contact_email: input.contact_email,
            contact_phone: input.contact_phone,
            website: input.website.map(Some),
            ..Default::default()
        };
        
        Suppliers::update(&mut con, id_int, &update_supplier)
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))
    }

    async fn delete_supplier(&self, ctx: &Context<'_>, id: async_graphql::ID) -> Result<bool> {
        let mut con = get_connection(ctx)?;
        
        let id_int: i32 = id.parse()
            .map_err(|_| async_graphql::Error::new("Invalid ID format"))?;
        
        Suppliers::delete(&mut con, id_int)
            .map(|count| count > 0)
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))
    }
}
