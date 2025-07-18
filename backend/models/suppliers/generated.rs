/* @generated and managed by dsync */

#[allow(unused)]
use crate::diesel::*;
use crate::schema::*;

pub type ConnectionType = create_rust_app::Connection;

/// Struct representing a row in table `suppliers`
#[tsync::tsync]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, diesel::Queryable, diesel::Selectable, diesel::QueryableByName, diesel::Identifiable)]
#[diesel(table_name=suppliers, primary_key(id))]
pub struct Suppliers {
    /// Field representing column `id`
    pub id: i32,
    /// Field representing column `name`
    pub name: String,
    /// Field representing column `address`
    pub address: String,
    /// Field representing column `city`
    pub city: String,
    /// Field representing column `state`
    pub state: String,
    /// Field representing column `zip_code`
    pub zip_code: String,
    /// Field representing column `country`
    pub country: String,
    /// Field representing column `contact_name`
    pub contact_name: String,
    /// Field representing column `contact_email`
    pub contact_email: String,
    /// Field representing column `contact_phone`
    pub contact_phone: String,
    /// Field representing column `website`
    pub website: Option<String>,
    /// Field representing column `created_at`
    pub created_at: chrono::DateTime<chrono::Utc>,
    /// Field representing column `updated_at`
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// Create Struct for a row in table `suppliers` for [`Suppliers`]
#[tsync::tsync]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, diesel::Insertable)]
#[diesel(table_name=suppliers)]
pub struct CreateSuppliers {
    /// Field representing column `name`
    pub name: String,
    /// Field representing column `address`
    pub address: String,
    /// Field representing column `city`
    pub city: String,
    /// Field representing column `state`
    pub state: String,
    /// Field representing column `zip_code`
    pub zip_code: String,
    /// Field representing column `country`
    pub country: String,
    /// Field representing column `contact_name`
    pub contact_name: String,
    /// Field representing column `contact_email`
    pub contact_email: String,
    /// Field representing column `contact_phone`
    pub contact_phone: String,
    /// Field representing column `website`
    pub website: Option<String>,
}

/// Update Struct for a row in table `suppliers` for [`Suppliers`]
#[tsync::tsync]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, diesel::AsChangeset, PartialEq, Default)]
#[diesel(table_name=suppliers)]
pub struct UpdateSuppliers {
    /// Field representing column `name`
    pub name: Option<String>,
    /// Field representing column `address`
    pub address: Option<String>,
    /// Field representing column `city`
    pub city: Option<String>,
    /// Field representing column `state`
    pub state: Option<String>,
    /// Field representing column `zip_code`
    pub zip_code: Option<String>,
    /// Field representing column `country`
    pub country: Option<String>,
    /// Field representing column `contact_name`
    pub contact_name: Option<String>,
    /// Field representing column `contact_email`
    pub contact_email: Option<String>,
    /// Field representing column `contact_phone`
    pub contact_phone: Option<String>,
    /// Field representing column `website`
    pub website: Option<Option<String>>,
    /// Field representing column `created_at`
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
    /// Field representing column `updated_at`
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// Result of a `.paginate` function
#[tsync::tsync]
#[derive(Debug, serde::Serialize)]
pub struct PaginationResult<T> {
    /// Resulting items that are from the current page
    pub items: Vec<T>,
    /// The count of total items there are
    pub total_items: i64,
    /// Current page, 0-based index
    pub page: i64,
    /// Size of a page
    pub page_size: i64,
    /// Number of total possible pages, given the `page_size` and `total_items`
    pub num_pages: i64,
}

impl Suppliers {
    /// Insert a new row into `suppliers` with a given [`CreateSuppliers`]
    pub fn create(db: &mut ConnectionType, item: &CreateSuppliers) -> diesel::QueryResult<Self> {
        use crate::schema::suppliers::dsl::*;

        diesel::insert_into(suppliers).values(item).get_result::<Self>(db)
    }

    /// Get a row from `suppliers`, identified by the primary key
    pub fn read(db: &mut ConnectionType, param_id: i32) -> diesel::QueryResult<Self> {
        use crate::schema::suppliers::dsl::*;

        suppliers.filter(id.eq(param_id)).first::<Self>(db)
    }

    /// Paginates through the table where page is a 0-based index (i.e. page 0 is the first page)
    pub fn paginate(db: &mut ConnectionType, page: i64, page_size: i64, filter: SuppliersFilter) -> diesel::QueryResult<PaginationResult<Self>> {
        let page = page.max(0);
        let page_size = page_size.max(1);
        let total_items = Self::filter(filter.clone()).count().get_result(db)?;
        let items = Self::filter(filter).limit(page_size).offset(page * page_size).load::<Self>(db)?;

        Ok(PaginationResult {
            items,
            total_items,
            page,
            page_size,
            /* ceiling division of integers */
            num_pages: total_items / page_size + i64::from(total_items % page_size != 0)
        })
    }

    /// A utility function to help build custom search queries
    /// 
    /// Example:
    /// 
    /// ```
    /// // create a filter for completed todos
    /// let query = Todo::filter(TodoFilter {
    ///     completed: Some(true),
    ///     ..Default::default()
    /// });
    /// 
    /// // delete completed todos
    /// diesel::delete(query).execute(db)?;
    /// ```
    pub fn filter<'a>(
        filter: SuppliersFilter,
    ) -> crate::schema::suppliers::BoxedQuery<'a, diesel::pg::Pg> {
        let mut query = crate::schema::suppliers::table.into_boxed();
        
        if let Some(filter_id) = filter.id {
            query = query.filter(crate::schema::suppliers::id.eq(filter_id));
        }
        if let Some(filter_name) = filter.name {
            query = query.filter(crate::schema::suppliers::name.eq(filter_name));
        }
        if let Some(filter_address) = filter.address {
            query = query.filter(crate::schema::suppliers::address.eq(filter_address));
        }
        if let Some(filter_city) = filter.city {
            query = query.filter(crate::schema::suppliers::city.eq(filter_city));
        }
        if let Some(filter_state) = filter.state {
            query = query.filter(crate::schema::suppliers::state.eq(filter_state));
        }
        if let Some(filter_zip_code) = filter.zip_code {
            query = query.filter(crate::schema::suppliers::zip_code.eq(filter_zip_code));
        }
        if let Some(filter_country) = filter.country {
            query = query.filter(crate::schema::suppliers::country.eq(filter_country));
        }
        if let Some(filter_contact_name) = filter.contact_name {
            query = query.filter(crate::schema::suppliers::contact_name.eq(filter_contact_name));
        }
        if let Some(filter_contact_email) = filter.contact_email {
            query = query.filter(crate::schema::suppliers::contact_email.eq(filter_contact_email));
        }
        if let Some(filter_contact_phone) = filter.contact_phone {
            query = query.filter(crate::schema::suppliers::contact_phone.eq(filter_contact_phone));
        }
        if let Some(filter_website) = filter.website {
            query = if filter_website.is_some() { 
                query.filter(crate::schema::suppliers::website.eq(filter_website))
            } else {
                query.filter(crate::schema::suppliers::website.is_null())
            };
        }
        if let Some(filter_created_at) = filter.created_at {
            query = query.filter(crate::schema::suppliers::created_at.eq(filter_created_at));
        }
        if let Some(filter_updated_at) = filter.updated_at {
            query = query.filter(crate::schema::suppliers::updated_at.eq(filter_updated_at));
        }
        
        query
    }

    /// Update a row in `suppliers`, identified by the primary key with [`UpdateSuppliers`]
    pub fn update(db: &mut ConnectionType, param_id: i32, item: &UpdateSuppliers) -> diesel::QueryResult<Self> {
        use crate::schema::suppliers::dsl::*;

        diesel::update(suppliers.filter(id.eq(param_id))).set(item).get_result(db)
    }

    /// Delete a row in `suppliers`, identified by the primary key
    pub fn delete(db: &mut ConnectionType, param_id: i32) -> diesel::QueryResult<usize> {
        use crate::schema::suppliers::dsl::*;

        diesel::delete(suppliers.filter(id.eq(param_id))).execute(db)
    }
}
#[derive(Debug, Default, Clone)]
pub struct SuppliersFilter {
    pub id: Option<i32>,
    pub name: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub contact_name: Option<String>,
    pub contact_email: Option<String>,
    pub contact_phone: Option<String>,
    pub website: Option<Option<String>>,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
}
