# vexmon

> **Showcase project** — demonstrates the [Vexil](https://github.com/vexil-lang/vexil) wire format in a real application. This is an example, not a maintained product. Use it as a reference for building your own Vexil-powered apps.

Real-time system monitor powered by Vexil — a typed schema language with sub-byte wire encoding.

Monitors CPU, memory, disk, network, and processes over WebSocket using Vexil's compact binary format. Typically **~300 bytes/second** for full system telemetry — 90%+ smaller than equivalent JSON.

## Quick Start

```sh
cargo install vexmon
vexmon
# Open http://127.0.0.1:3000
```

## Features

- **6 monitoring panels**: CPU (per-core), memory (with swap/cache breakdown), disk usage, network throughput, processes (top 50), system info
- **Process search & sort**: Filter by name/PID, click column headers to sort
- **Wire efficiency**: Header shows rolling average bandwidth, peak, JSON equivalent, and savings percentage
- **Schema handshake**: Browser verifies schema compatibility on connect
- **Instant load**: All panels populate immediately, then update at staggered intervals

## Architecture

```
┌─────────────────────┐     binary WebSocket      ┌──────────────────────┐
│   Rust Backend      │ ─────────────────────────→ │   Browser Frontend   │
│                     │    ~50 bytes/frame          │                      │
│  sysinfo → Pack     │    union TelemetryFrame     │  Unpack → render     │
│  (vexil-runtime)    │    schema handshake         │  (@vexil-lang/runtime)│
└─────────────────────┘                            └──────────────────────┘
```

**Backend** (Rust + axum):
- Collects metrics via `sysinfo` crate
- Encodes as Vexil union frames using generated `Pack` impls
- Sends binary WebSocket messages at staggered intervals:
  - CPU + Memory: every 1s
  - Network: every 2s
  - Disk + Processes: every 5s
  - System info: once on connect

**Frontend** (TypeScript + vanilla DOM):
- Decodes binary frames using generated TypeScript decoders from `@vexil-lang/runtime`
- Dispatches by union tag (`Cpu`, `Memory`, `Disks`, `Network`, `Processes`, `System`)
- Zero framework dependencies — just the Vexil runtime

## Schema

The telemetry schema (`schema/telemetry.vexil`) defines:

| Type | Vexil Features | Update Rate |
|------|---------------|-------------|
| `CpuSnapshot` | `u8`, `array<u8>`, `u16` | 1s |
| `MemorySnapshot` | `u64` for byte-precise values | 1s |
| `DiskInfo` | `string` mount points, `u32`/`u64` | 5s |
| `NetworkInfo` | `string` interfaces, `u64` counters | 2s |
| `ProcessInfo` | `u32` PID, `string` name, `enum ProcessState` | 5s |
| `SystemInfo` | `string` fields, `u64` uptime | once |
| `TelemetryFrame` | **union** dispatching all of the above | mixed |

The union `TelemetryFrame` is the key pattern — each WebSocket message is a single variant, enabling different update rates per data type while using one connection and one schema.

## Wire Size

| What | Vexil | JSON equivalent |
|------|-------|----------------|
| CPU snapshot (8 cores) | ~14 bytes | ~180 bytes |
| Memory snapshot | ~42 bytes | ~120 bytes |
| Network (1 interface) | ~55 bytes | ~150 bytes |
| Process list (50) | ~400 bytes | ~5,000 bytes |
| **Average throughput** | **~300 B/s** | **~3,600 B/s** |

## Development

### Prerequisites

- Rust 1.94+ (for vexil-runtime)
- Node.js 18+ (for esbuild bundling)
- `vexilc` CLI (`cargo install vexilc`)

### Build from source

```sh
git clone https://github.com/vexil-lang/vexmon
cd vexmon

# Install JS deps and bundle the TypeScript decoder
npm install
npm run bundle

# Build and run
cargo run --release
```

### Regenerating code after schema changes

```sh
# Rust backend
cargo run -p vexilc -- codegen schema/telemetry.vexil --target rust > src/generated.rs

# TypeScript frontend
cargo run -p vexilc -- codegen schema/telemetry.vexil --target typescript > frontend/generated.ts
npm run bundle
```

### Project structure

```
schema/
  telemetry.vexil       # Vexil schema — the single source of truth
src/
  main.rs               # axum server, WebSocket handler, frame dispatch
  generated.rs          # Generated Rust Pack/Unpack (from vexilc)
  collectors/           # System metric collectors (cpu, memory, disk, network, process, system)
frontend/
  index.html            # Dashboard layout
  style.css             # Industrial dark theme
  app.ts                # WebSocket client, decoders, renderers
  generated.ts          # Generated TypeScript decoders (from vexilc)
static/
  bundle.js             # esbuild output (embedded in binary via include_str!)
```

## License

MIT OR Apache-2.0
