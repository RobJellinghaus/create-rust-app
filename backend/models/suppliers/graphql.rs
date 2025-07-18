use async_graphql::{SimpleObject, Object};
use super::generated::{Suppliers, PaginationResult};

// Manual GraphQL Object implementation for Suppliers
// This is needed because dsync's hardcoded GraphQL template assumes a "text" field
// which doesn't exist in the suppliers table
#[Object]
impl Suppliers {
    async fn id(&self) -> async_graphql::ID {
        async_graphql::ID(self.id.to_string())
    }

    async fn name(&self) -> &String {
        &self.name
    }

    async fn address(&self) -> &String {
        &self.address
    }

    async fn city(&self) -> &String {
        &self.city
    }

    async fn state(&self) -> &String {
        &self.state
    }

    async fn zip_code(&self) -> &String {
        &self.zip_code
    }

    async fn country(&self) -> &String {
        &self.country
    }

    async fn contact_name(&self) -> &String {
        &self.contact_name
    }

    async fn contact_email(&self) -> &String {
        &self.contact_email
    }

    async fn contact_phone(&self) -> &String {
        &self.contact_phone
    }

    async fn website(&self) -> &Option<String> {
        &self.website
    }

    async fn created_at(&self) -> &chrono::DateTime<chrono::Utc> {
        &self.created_at
    }

    async fn updated_at(&self) -> &chrono::DateTime<chrono::Utc> {
        &self.updated_at
    }
}

// Manual GraphQL SimpleObject implementation for PaginationResult<Suppliers>
// This is needed because dsync disabled GraphQL generation for suppliers
#[derive(SimpleObject)]
#[graphql(name = "SupplierPaginationResult")]
pub struct SupplierPaginationResult {
    /// Resulting items that are from the current page
    pub items: Vec<Suppliers>,
    /// The count of total items there are
    pub total_items: i64,
    /// Current page, 0-based index
    pub page: i64,
    /// Size of a page
    pub page_size: i64,
    /// Number of total possible pages, given the `page_size` and `total_items`
    pub num_pages: i64,
}

impl From<PaginationResult<Suppliers>> for SupplierPaginationResult {
    fn from(result: PaginationResult<Suppliers>) -> Self {
        Self {
            items: result.items,
            total_items: result.total_items,
            page: result.page,
            page_size: result.page_size,
            num_pages: result.num_pages,
        }
    }
}