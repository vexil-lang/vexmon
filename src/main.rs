#[path = "generated.rs"]
#[allow(dead_code)]
mod generated;
mod collectors;

use generated::*;
use vexil_runtime::{BitWriter, Pack, SchemaHandshake, HandshakeResult};

use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::Html,
    routing::get,
    Router,
};
use sysinfo::{Disks, Networks, System};
use tokio::time::{interval, Duration};

static INDEX_HTML: &str = include_str!("../frontend/index.html");
static STYLE_CSS: &str = include_str!("../frontend/style.css");
static BUNDLE_JS: &str = include_str!("../static/bundle.js");

#[tokio::main]
async fn main() {
    let addr = "127.0.0.1:3000";

    let app = Router::new()
        .route("/", get(index))
        .route("/style.css", get(style_css))
        .route("/bundle.js", get(bundle_js))
        .route("/ws", get(ws_handler));

    println!("vexmon running at http://{addr}");
    println!("Press Ctrl+C to stop.");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn index() -> Html<&'static str> {
    Html(INDEX_HTML)
}

async fn style_css() -> ([(axum::http::header::HeaderName, &'static str); 1], &'static str) {
    (
        [(axum::http::header::CONTENT_TYPE, "text/css")],
        STYLE_CSS,
    )
}

async fn bundle_js() -> ([(axum::http::header::HeaderName, &'static str); 1], &'static str) {
    (
        [(axum::http::header::CONTENT_TYPE, "application/javascript")],
        BUNDLE_JS,
    )
}

async fn ws_handler(ws: WebSocketUpgrade) -> impl axum::response::IntoResponse {
    ws.on_upgrade(handle_ws)
}

async fn handle_ws(mut socket: WebSocket) {
    // Wait for client's schema handshake first
    let local = SchemaHandshake::new(SCHEMA_HASH, "0.1.0");

    let remote = loop {
        match socket.recv().await {
            Some(Ok(Message::Binary(bytes))) => match SchemaHandshake::decode(&bytes) {
                Ok(hs) => break hs,
                Err(_) => return,
            },
            Some(Ok(Message::Close(_))) | None => return,
            _ => continue,
        }
    };
    match local.check(&remote) {
        HandshakeResult::Match => {}
        HandshakeResult::VersionMismatch { .. } => {
            let _ = socket
                .send(Message::Text("schema mismatch".into()))
                .await;
            return;
        }
    }

    let mut sys = System::new_all();
    let mut disks = Disks::new_with_refreshed_list();
    let mut networks = Networks::new_with_refreshed_list();
    sys.refresh_all();
    tokio::time::sleep(Duration::from_millis(500)).await;

    // Send system info once
    let sysinfo = collectors::system::collect(&sys);
    let frame = TelemetryFrame::System { info: sysinfo };
    if send_frame(&mut socket, &frame).await.is_err() {
        return;
    }

    let mut tick = interval(Duration::from_secs(1));
    let mut tick_count: u64 = 0;

    loop {
        tick.tick().await;
        tick_count += 1;
        sys.refresh_all();

        // CPU + Memory every tick (1s)
        let cpu = collectors::cpu::collect(&sys);
        let cpu_frame = TelemetryFrame::Cpu { snapshot: cpu };
        if send_frame(&mut socket, &cpu_frame).await.is_err() {
            break;
        }

        let mem = collectors::memory::collect(&sys);
        let mem_frame = TelemetryFrame::Memory { snapshot: mem };
        if send_frame(&mut socket, &mem_frame).await.is_err() {
            break;
        }

        // Network every 2s
        if tick_count % 2 == 0 {
            networks.refresh(false);
            let nets = collectors::network::collect(&networks);
            let net_frame = TelemetryFrame::Network { interfaces: nets };
            if send_frame(&mut socket, &net_frame).await.is_err() {
                break;
            }
        }

        // Disks + Processes every 5s
        if tick_count % 5 == 0 {
            disks.refresh(false);
            let disk_list = collectors::disk::collect(&disks);
            let disk_frame = TelemetryFrame::Disks { disks: disk_list };
            if send_frame(&mut socket, &disk_frame).await.is_err() {
                break;
            }

            let procs = collectors::process::collect(&sys, 15);
            let proc_frame = TelemetryFrame::Processes { top: procs };
            if send_frame(&mut socket, &proc_frame).await.is_err() {
                break;
            }
        }
    }
}

async fn send_frame(socket: &mut WebSocket, frame: &TelemetryFrame) -> Result<(), ()> {
    let mut w = BitWriter::new();
    if frame.pack(&mut w).is_err() {
        return Err(());
    }
    let bytes = w.finish();
    socket
        .send(Message::Binary(bytes.into()))
        .await
        .map_err(|_| ())
}
