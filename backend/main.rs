extern crate diesel;

use actix_files::{Files};
use actix_web::{App, HttpServer, web};
use actix_web::middleware::{Compress, Logger, TrailingSlash, NormalizePath};
use actix_web::web::Data;
use fang::{AsyncQueueable, AsyncRunnable, NoTls, Queueable};
use create_rust_app::AppConfig;

mod schema;
mod services;
mod models;
mod mail;
mod tasks;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    #[cfg(debug_assertions)] create_rust_app::setup_development().await;
    let app_data = create_rust_app::setup();
    simple_logger::init_with_env().unwrap();

    // Tasks plugin example: sync queue example
    // See fang docs for more info: https://docs.rs/fang/0.10.4/fang/
    {
        // The blocking queue re-uses the app's db connection pool
        let queue = create_rust_app::tasks::queue();

        // An example of how to schedule a blocking task (see `fang` docs for more info):
        use fang::Queueable;
        queue.schedule_task(&tasks::daily_todo::DailyTodo { text: "Call mom (DailyTodo task)".to_string() }).unwrap();
    }

    // Tasks plugin example: async queue example
    // See fang docs for more info: https://docs.rs/fang/0.10.4/fang/
    {
        // The async queue uses a separate db connection pool. We need to connnect it at least once before we can use it throughout out app.
        let mut async_queue = create_rust_app::tasks::async_queue();
        async_queue.lock().unwrap().connect(NoTls).await.expect("Failed to connect to async queue database");
        // this means you need to have the above line somewhere in `main.rs`, before any async jobs are scheduled

        // and here's how you can schedule an async task:
        async_queue.lock().unwrap().schedule_task(&tasks::daily_todo_async::DailyTodoAsync { text: "Call mom (DailyTodoAsync task)".to_string() } as &dyn AsyncRunnable).await.unwrap();
    }

    HttpServer::new(move || {
        let mut app = App::new()
            .wrap(Compress::default())
            .wrap(NormalizePath::new(TrailingSlash::MergeOnly))
            .wrap(Logger::default());

        app = app.app_data(Data::new(app_data.database.clone()));
        app = app.app_data(Data::new(app_data.mailer.clone()));
        app = app.app_data(Data::new(app_data.storage.clone()));
        app = app.app_data(Data::new(AppConfig {
            app_url: std::env::var("APP_URL").unwrap(),
        }));
        app = app.app_data(Data::new(create_rust_app::auth::AuthConfig {
            oidc_providers: vec![create_rust_app::auth::oidc::OIDCProvider::GOOGLE(
                std::env::var("GOOGLE_OAUTH2_CLIENT_ID").unwrap(),
                std::env::var("GOOGLE_OAUTH2_CLIENT_SECRET").unwrap(),
                format!(
                    "{app_url}/oauth/success",
                    app_url = std::env::var("APP_URL").unwrap()
                ),
                format!(
                    "{app_url}/oauth/error",
                    app_url = std::env::var("APP_URL").unwrap()
                ),
            )],
        }));


        let mut api_scope = web::scope("/api");
        api_scope = api_scope.service(services::file::endpoints(web::scope("/files")));
        api_scope = api_scope.service(create_rust_app::auth::endpoints(web::scope("/auth")));
        api_scope = api_scope.service(services::todo::endpoints(web::scope("/todos")));

        #[cfg(debug_assertions)]
        {
            /* Development-only routes */
            // Mount development-only API routes
            api_scope = api_scope.service(create_rust_app::dev::endpoints(web::scope("/development")));
            // Mount the admin dashboard on /admin
            app = app.service(web::scope("/admin").service(Files::new("/", ".cargo/admin/dist/").index_file("admin.html")));
        }

        app = app.service(api_scope);
        app = app.default_service(web::get().to(create_rust_app::render_views));
        app
    }).bind("0.0.0.0:3000")?.run().await
}
