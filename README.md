# vexmon

Real-time system monitor powered by [Vexil](https://github.com/vexil-lang/vexil) bitpack wire format.

Demonstrates Vexil's compact binary encoding for live telemetry: CPU, memory, disk, network, and process monitoring over WebSocket with ~30-50 bytes per frame.

## Install

```sh
cargo install vexmon
```

## Run

```sh
vexmon
# Open http://127.0.0.1:3000
```

## How it works

1. Rust backend collects system metrics via `sysinfo`
2. Encodes as Vexil union frames (`TelemetryFrame`) via generated `Pack` impls
3. Sends compact binary over WebSocket (30-50 bytes/frame vs 500+ bytes JSON)
4. Browser decodes with generated TypeScript decoders from `@vexil-lang/runtime`
5. Renders live dashboard

## Schema

See `schema/telemetry.vexil` — uses unions, delta encoding, enums, arrays, and schema handshake.

## License

MIT OR Apache-2.0
