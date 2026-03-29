// node_modules/@vexil-lang/runtime/dist/bit-reader.js
var MAX_RECURSION_DEPTH = 64;
var MAX_BYTES_LENGTH = 1 << 26;
var MAX_LENGTH_PREFIX_BYTES = 4;
var textDecoder = new TextDecoder("utf-8", { fatal: true });
var BitReader = class {
  data;
  bytePos = 0;
  bitOffset = 0;
  recursionDepth = 0;
  constructor(data) {
    this.data = data;
  }
  /**
   * Read `count` bits LSB-first into a number.
   */
  readBits(count) {
    let result = 0;
    for (let i = 0; i < count; i++) {
      if (this.bytePos >= this.data.length) {
        throw new Error("Unexpected end of data");
      }
      const bit = this.data[this.bytePos] >>> this.bitOffset & 1;
      result |= bit << i;
      this.bitOffset++;
      if (this.bitOffset === 8) {
        this.bytePos++;
        this.bitOffset = 0;
      }
    }
    return result;
  }
  /**
   * Read a single bit as boolean.
   */
  readBool() {
    return this.readBits(1) !== 0;
  }
  /**
   * Advance to the next byte boundary, discarding any remaining bits
   * in the current byte.
   */
  flushToByteBoundary() {
    if (this.bitOffset > 0) {
      this.bytePos++;
      this.bitOffset = 0;
    }
  }
  /**
   * Number of remaining bytes from current position.
   */
  remaining() {
    return Math.max(0, this.data.length - this.bytePos);
  }
  /**
   * Read a u8, aligning to a byte boundary first.
   */
  readU8() {
    this.flushToByteBoundary();
    if (this.remaining() < 1) {
      throw new Error("Unexpected end of data");
    }
    const v = this.data[this.bytePos];
    this.bytePos++;
    return v;
  }
  /**
   * Read a little-endian u16, aligning to a byte boundary first.
   */
  readU16() {
    this.flushToByteBoundary();
    if (this.remaining() < 2) {
      throw new Error("Unexpected end of data");
    }
    const v = this.data[this.bytePos] | this.data[this.bytePos + 1] << 8;
    this.bytePos += 2;
    return v;
  }
  /**
   * Read a little-endian u32, aligning to a byte boundary first.
   */
  readU32() {
    this.flushToByteBoundary();
    if (this.remaining() < 4) {
      throw new Error("Unexpected end of data");
    }
    const dv = new DataView(this.data.buffer, this.data.byteOffset + this.bytePos, 4);
    const v = dv.getUint32(0, true);
    this.bytePos += 4;
    return v;
  }
  /**
   * Read a little-endian u64, aligning to a byte boundary first.
   */
  readU64() {
    this.flushToByteBoundary();
    if (this.remaining() < 8) {
      throw new Error("Unexpected end of data");
    }
    const dv = new DataView(this.data.buffer, this.data.byteOffset + this.bytePos, 8);
    const v = dv.getBigUint64(0, true);
    this.bytePos += 8;
    return v;
  }
  /**
   * Read an i8, aligning to a byte boundary first.
   */
  readI8() {
    this.flushToByteBoundary();
    if (this.remaining() < 1) {
      throw new Error("Unexpected end of data");
    }
    const v = this.data[this.bytePos];
    this.bytePos++;
    return v << 24 >> 24;
  }
  /**
   * Read a little-endian i16, aligning to a byte boundary first.
   */
  readI16() {
    this.flushToByteBoundary();
    if (this.remaining() < 2) {
      throw new Error("Unexpected end of data");
    }
    const dv = new DataView(this.data.buffer, this.data.byteOffset + this.bytePos, 2);
    const v = dv.getInt16(0, true);
    this.bytePos += 2;
    return v;
  }
  /**
   * Read a little-endian i32, aligning to a byte boundary first.
   */
  readI32() {
    this.flushToByteBoundary();
    if (this.remaining() < 4) {
      throw new Error("Unexpected end of data");
    }
    const dv = new DataView(this.data.buffer, this.data.byteOffset + this.bytePos, 4);
    const v = dv.getInt32(0, true);
    this.bytePos += 4;
    return v;
  }
  /**
   * Read a little-endian i64, aligning to a byte boundary first.
   */
  readI64() {
    this.flushToByteBoundary();
    if (this.remaining() < 8) {
      throw new Error("Unexpected end of data");
    }
    const dv = new DataView(this.data.buffer, this.data.byteOffset + this.bytePos, 8);
    const v = dv.getBigInt64(0, true);
    this.bytePos += 8;
    return v;
  }
  /**
   * Read a little-endian f32, aligning to a byte boundary first.
   */
  readF32() {
    this.flushToByteBoundary();
    if (this.remaining() < 4) {
      throw new Error("Unexpected end of data");
    }
    const dv = new DataView(this.data.buffer, this.data.byteOffset + this.bytePos, 4);
    const v = dv.getFloat32(0, true);
    this.bytePos += 4;
    return v;
  }
  /**
   * Read a little-endian f64, aligning to a byte boundary first.
   */
  readF64() {
    this.flushToByteBoundary();
    if (this.remaining() < 8) {
      throw new Error("Unexpected end of data");
    }
    const dv = new DataView(this.data.buffer, this.data.byteOffset + this.bytePos, 8);
    const v = dv.getFloat64(0, true);
    this.bytePos += 8;
    return v;
  }
  /**
   * Read a LEB128-encoded unsigned integer.
   */
  readLeb128() {
    this.flushToByteBoundary();
    let result = 0;
    let shift = 0;
    for (let i = 0; i < MAX_LENGTH_PREFIX_BYTES; i++) {
      if (this.bytePos >= this.data.length) {
        throw new Error("Unexpected end of data");
      }
      const byte = this.data[this.bytePos];
      this.bytePos++;
      result |= (byte & 127) << shift;
      shift += 7;
      if ((byte & 128) === 0) {
        if (i > 0 && byte === 0) {
          throw new Error("Invalid varint: overlong encoding");
        }
        return result;
      }
    }
    throw new Error("Invalid varint: exceeds maximum length");
  }
  /**
   * Read a LEB128-encoded unsigned 64-bit integer as bigint.
   */
  readLeb12864() {
    this.flushToByteBoundary();
    let result = 0n;
    let shift = 0n;
    for (let i = 0; i < 10; i++) {
      if (this.bytePos >= this.data.length) {
        throw new Error("Unexpected end of data");
      }
      const byte = this.data[this.bytePos];
      this.bytePos++;
      result |= BigInt(byte & 127) << shift;
      shift += 7n;
      if ((byte & 128) === 0) {
        if (i > 0 && byte === 0) {
          throw new Error("Invalid varint: overlong encoding");
        }
        return result;
      }
    }
    throw new Error("Invalid varint: exceeds maximum length");
  }
  /**
   * Read a ZigZag + LEB128 encoded signed integer (up to 32-bit).
   */
  readZigZag(typeBits) {
    void typeBits;
    const raw = this.readLeb128();
    return raw >>> 1 ^ -(raw & 1);
  }
  /**
   * Read a ZigZag + LEB128 encoded signed 64-bit integer as bigint.
   */
  readZigZag64() {
    const raw = this.readLeb12864();
    return raw >> 1n ^ -(raw & 1n);
  }
  /**
   * Read a length-prefixed UTF-8 string.
   */
  readString() {
    this.flushToByteBoundary();
    const len = this.readLeb128();
    if (len > MAX_BYTES_LENGTH) {
      throw new Error(`String length ${len} exceeds limit ${MAX_BYTES_LENGTH}`);
    }
    if (this.remaining() < len) {
      throw new Error("Unexpected end of data");
    }
    const bytes = this.data.subarray(this.bytePos, this.bytePos + len);
    this.bytePos += len;
    return textDecoder.decode(bytes);
  }
  /**
   * Read a length-prefixed byte array.
   */
  readBytes() {
    this.flushToByteBoundary();
    const len = this.readLeb128();
    if (len > MAX_BYTES_LENGTH) {
      throw new Error(`Bytes length ${len} exceeds limit ${MAX_BYTES_LENGTH}`);
    }
    if (this.remaining() < len) {
      throw new Error("Unexpected end of data");
    }
    const bytes = this.data.slice(this.bytePos, this.bytePos + len);
    this.bytePos += len;
    return bytes;
  }
  /**
   * Read exactly `count` raw bytes with no length prefix.
   */
  readRawBytes(count) {
    this.flushToByteBoundary();
    if (this.remaining() < count) {
      throw new Error("Unexpected end of data");
    }
    const bytes = this.data.slice(this.bytePos, this.bytePos + count);
    this.bytePos += count;
    return bytes;
  }
  /**
   * Read all remaining bytes from the current position to the end.
   * Flushes to byte boundary first. Returns an empty Uint8Array if no bytes remain.
   */
  readRemaining() {
    this.flushToByteBoundary();
    if (this.bytePos >= this.data.length) {
      return new Uint8Array(0);
    }
    const result = this.data.slice(this.bytePos);
    this.bytePos = this.data.length;
    return result;
  }
  /**
   * Increment recursion depth; throws if limit exceeded.
   */
  enterNested() {
    this.recursionDepth++;
    if (this.recursionDepth > MAX_RECURSION_DEPTH) {
      throw new Error("Recursion limit exceeded");
    }
  }
  /**
   * Decrement recursion depth.
   */
  leaveNested() {
    if (this.recursionDepth > 0) {
      this.recursionDepth--;
    }
  }
};

// node_modules/@vexil-lang/runtime/dist/bit-writer.js
var MAX_RECURSION_DEPTH2 = 64;
var textEncoder = new TextEncoder();
var BitWriter = class {
  buf = [];
  currentByte = 0;
  bitOffset = 0;
  recursionDepth = 0;
  /**
   * Internal: align to a byte boundary without the "empty = zero byte" rule.
   * Used before multi-byte writes to ensure alignment.
   */
  align() {
    if (this.bitOffset > 0) {
      this.buf.push(this.currentByte);
      this.currentByte = 0;
      this.bitOffset = 0;
    }
  }
  /**
   * Write `count` bits from `value`, LSB first.
   */
  writeBits(value, count) {
    let v = value;
    for (let i = 0; i < count; i++) {
      const bit = v & 1;
      this.currentByte |= bit << this.bitOffset;
      this.bitOffset++;
      if (this.bitOffset === 8) {
        this.buf.push(this.currentByte);
        this.currentByte = 0;
        this.bitOffset = 0;
      }
      v >>>= 1;
    }
  }
  /**
   * Write a single boolean as 1 bit.
   */
  writeBool(v) {
    this.writeBits(v ? 1 : 0, 1);
  }
  /**
   * Flush any partial byte to the buffer.
   *
   * Special case per spec section 4.1: if nothing has been written at all
   * (bitOffset == 0 AND buf is empty), push a zero byte anyway.
   * If bitOffset == 0 and buf is non-empty, this is a no-op.
   */
  flushToByteBoundary() {
    if (this.bitOffset === 0) {
      if (this.buf.length === 0) {
        this.buf.push(0);
      }
    } else {
      this.buf.push(this.currentByte);
      this.currentByte = 0;
      this.bitOffset = 0;
    }
  }
  /**
   * Write a u8, aligning to a byte boundary first.
   */
  writeU8(v) {
    this.align();
    this.buf.push(v & 255);
  }
  /**
   * Write a u16 in little-endian byte order, aligning first.
   */
  writeU16(v) {
    this.align();
    this.buf.push(v & 255);
    this.buf.push(v >>> 8 & 255);
  }
  /**
   * Write a u32 in little-endian byte order, aligning first.
   */
  writeU32(v) {
    this.align();
    this.buf.push(v & 255);
    this.buf.push(v >>> 8 & 255);
    this.buf.push(v >>> 16 & 255);
    this.buf.push(v >>> 24 & 255);
  }
  /**
   * Write a u64 in little-endian byte order, aligning first.
   */
  writeU64(v) {
    this.align();
    const mask = BigInt(255);
    for (let i = 0; i < 8; i++) {
      this.buf.push(Number(v >> BigInt(i * 8) & mask));
    }
  }
  /**
   * Write an i8, aligning to a byte boundary first.
   */
  writeI8(v) {
    this.align();
    this.buf.push(v & 255);
  }
  /**
   * Write an i16 in little-endian byte order, aligning first.
   */
  writeI16(v) {
    this.align();
    const ab = new ArrayBuffer(2);
    new DataView(ab).setInt16(0, v, true);
    const bytes = new Uint8Array(ab);
    this.buf.push(bytes[0], bytes[1]);
  }
  /**
   * Write an i32 in little-endian byte order, aligning first.
   */
  writeI32(v) {
    this.align();
    const ab = new ArrayBuffer(4);
    new DataView(ab).setInt32(0, v, true);
    const bytes = new Uint8Array(ab);
    this.buf.push(bytes[0], bytes[1], bytes[2], bytes[3]);
  }
  /**
   * Write an i64 in little-endian byte order, aligning first.
   */
  writeI64(v) {
    this.align();
    const ab = new ArrayBuffer(8);
    new DataView(ab).setBigInt64(0, v, true);
    const bytes = new Uint8Array(ab);
    for (let i = 0; i < 8; i++) {
      this.buf.push(bytes[i]);
    }
  }
  /**
   * Write an f32, canonicalizing NaN to 0x7FC00000.
   */
  writeF32(v) {
    this.align();
    const ab = new ArrayBuffer(4);
    const dv = new DataView(ab);
    if (Number.isNaN(v)) {
      dv.setUint32(0, 2143289344, true);
    } else {
      dv.setFloat32(0, v, true);
    }
    const bytes = new Uint8Array(ab);
    this.buf.push(bytes[0], bytes[1], bytes[2], bytes[3]);
  }
  /**
   * Write an f64, canonicalizing NaN to 0x7FF8000000000000.
   */
  writeF64(v) {
    this.align();
    const ab = new ArrayBuffer(8);
    const dv = new DataView(ab);
    if (Number.isNaN(v)) {
      dv.setUint32(0, 0, true);
      dv.setUint32(4, 2146959360, true);
    } else {
      dv.setFloat64(0, v, true);
    }
    const bytes = new Uint8Array(ab);
    for (let i = 0; i < 8; i++) {
      this.buf.push(bytes[i]);
    }
  }
  /**
   * Write a LEB128-encoded unsigned integer.
   */
  writeLeb128(value) {
    this.align();
    let v = value;
    do {
      let byte = v & 127;
      v >>>= 7;
      if (v !== 0) {
        byte |= 128;
      }
      this.buf.push(byte);
    } while (v !== 0);
  }
  /**
   * Write a LEB128-encoded unsigned 64-bit integer (bigint).
   */
  writeLeb12864(value) {
    this.align();
    let v = value < 0n ? value + (1n << 64n) : value;
    do {
      let byte = Number(v & 0x7fn);
      v >>= 7n;
      if (v !== 0n) {
        byte |= 128;
      }
      this.buf.push(byte);
    } while (v !== 0n);
  }
  /**
   * Write a ZigZag + LEB128 encoded signed integer (up to 32-bit).
   */
  writeZigZag(value, typeBits) {
    const zigzag = value << 1 ^ value >> typeBits - 1;
    this.writeLeb128(zigzag >>> 0);
  }
  /**
   * Write a ZigZag + LEB128 encoded signed 64-bit integer (bigint).
   */
  writeZigZag64(value) {
    const zigzag = value << 1n ^ value >> 63n;
    this.writeLeb12864(zigzag < 0n ? zigzag + (1n << 64n) : zigzag);
  }
  /**
   * Write a UTF-8 string with a LEB128 length prefix.
   */
  writeString(s) {
    this.align();
    const encoded = textEncoder.encode(s);
    this.writeLeb128Internal(encoded.length);
    for (let i = 0; i < encoded.length; i++) {
      this.buf.push(encoded[i]);
    }
  }
  /**
   * Write a byte array with a LEB128 length prefix.
   */
  writeBytes(data) {
    this.align();
    this.writeLeb128Internal(data.length);
    for (let i = 0; i < data.length; i++) {
      this.buf.push(data[i]);
    }
  }
  /**
   * Write raw bytes with no length prefix, aligning first.
   */
  writeRawBytes(data) {
    this.align();
    for (let i = 0; i < data.length; i++) {
      this.buf.push(data[i]);
    }
  }
  /**
   * Increment recursion depth; throws if limit exceeded.
   */
  enterNested() {
    this.recursionDepth++;
    if (this.recursionDepth > MAX_RECURSION_DEPTH2) {
      throw new Error("Recursion limit exceeded");
    }
  }
  /**
   * Decrement recursion depth.
   */
  leaveNested() {
    if (this.recursionDepth > 0) {
      this.recursionDepth--;
    }
  }
  /**
   * Flush any partial byte and return the finished buffer.
   */
  finish() {
    this.flushToByteBoundary();
    return new Uint8Array(this.buf);
  }
  /**
   * Internal LEB128 encode that does NOT call align() — used by writeString/writeBytes
   * which have already aligned.
   */
  writeLeb128Internal(value) {
    let v = value;
    do {
      let byte = v & 127;
      v >>>= 7;
      if (v !== 0) {
        byte |= 128;
      }
      this.buf.push(byte);
    } while (v !== 0);
  }
};

// node_modules/@vexil-lang/runtime/dist/handshake.js
var SchemaHandshake = class _SchemaHandshake {
  hash;
  version;
  constructor(hash, version) {
    this.hash = hash;
    this.version = version;
  }
  /** Encode this handshake (hash + version) into a wire-format byte array. */
  encode() {
    const w = new BitWriter();
    w.writeRawBytes(this.hash);
    w.writeString(this.version);
    return w.finish();
  }
  /** Decode a wire-format byte array into a SchemaHandshake. */
  static decode(bytes) {
    const r = new BitReader(bytes);
    const hash = r.readRawBytes(32);
    const version = r.readString();
    return new _SchemaHandshake(hash, version);
  }
  /** Compare this handshake against a remote one, returning match or mismatch details. */
  check(remote) {
    const match_ = this.hash.length === remote.hash.length && this.hash.every((b, i) => b === remote.hash[i]);
    if (match_) {
      return { kind: "match" };
    }
    return {
      kind: "version_mismatch",
      localVersion: this.version,
      remoteVersion: remote.version,
      localHash: this.hash,
      remoteHash: remote.hash
    };
  }
};

// frontend/generated.ts
var SCHEMA_HASH = new Uint8Array([17, 4, 15, 108, 27, 72, 82, 44, 66, 248, 132, 117, 159, 216, 238, 103, 252, 236, 160, 128, 231, 120, 195, 142, 190, 147, 117, 235, 56, 82, 62, 190]);
function decodeCpuSnapshot(r) {
  const overall = r.readU8();
  const per_core_len = r.readLeb128();
  const per_core = [];
  for (let i = 0; i < per_core_len; i++) {
    const per_core_item = r.readU8();
    per_core.push(per_core_item);
  }
  const frequency = r.readU16();
  r.flushToByteBoundary();
  const _unknown = new Uint8Array(0);
  return { overall, per_core, frequency, _unknown };
}
function decodeMemorySnapshot(r) {
  const used_bytes = r.readU64();
  const total_bytes = r.readU64();
  const swap_used = r.readU64();
  const swap_total = r.readU64();
  const cached_bytes = r.readU64();
  r.flushToByteBoundary();
  const _unknown = new Uint8Array(0);
  return { used_bytes, total_bytes, swap_used, swap_total, cached_bytes, _unknown };
}
function decodeDiskInfo(r) {
  const name = r.readString();
  const mount = r.readString();
  const total_gb = r.readU32();
  const used_gb = r.readU32();
  const read_bps = r.readU64();
  const write_bps = r.readU64();
  r.flushToByteBoundary();
  const _unknown = new Uint8Array(0);
  return { name, mount, total_gb, used_gb, read_bps, write_bps, _unknown };
}
function decodeNetworkInfo(r) {
  const name = r.readString();
  const rx_bps = r.readU64();
  const tx_bps = r.readU64();
  const total_rx = r.readU64();
  const total_tx = r.readU64();
  r.flushToByteBoundary();
  const _unknown = new Uint8Array(0);
  return { name, rx_bps, tx_bps, total_rx, total_tx, _unknown };
}
function decodeProcessState(r) {
  const disc = r.readBits(3);
  switch (disc) {
    case 0:
      return "Running";
    case 1:
      return "Sleeping";
    case 2:
      return "Stopped";
    case 3:
      return "Zombie";
    case 4:
      return "Unknown";
    default:
      throw new Error(`Unknown ProcessState discriminant: ${disc}`);
  }
}
function decodeProcessInfo(r) {
  const pid = r.readU32();
  const name = r.readString();
  const cpu_pct = r.readU8();
  const mem_mb = r.readU32();
  r.enterNested();
  const state = decodeProcessState(r);
  r.leaveNested();
  r.flushToByteBoundary();
  const _unknown = new Uint8Array(0);
  return { pid, name, cpu_pct, mem_mb, state, _unknown };
}
function decodeSystemInfo(r) {
  const hostname = r.readString();
  const os_name = r.readString();
  const os_version = r.readString();
  const kernel = r.readString();
  const uptime_secs = r.readU64();
  const cpu_brand = r.readString();
  const cpu_count = r.readU8();
  r.flushToByteBoundary();
  const _unknown = new Uint8Array(0);
  return { hostname, os_name, os_version, kernel, uptime_secs, cpu_brand, cpu_count, _unknown };
}
function decodeTelemetryFrame(r) {
  r.flushToByteBoundary();
  const disc = r.readLeb128();
  const len = r.readLeb128();
  switch (disc) {
    case 0: {
      const payloadBytes = r.readRawBytes(len);
      const pr = new BitReader(payloadBytes);
      pr.enterNested();
      const snapshot = decodeCpuSnapshot(pr);
      pr.leaveNested();
      pr.flushToByteBoundary();
      return { tag: "Cpu", snapshot };
    }
    case 1: {
      const payloadBytes = r.readRawBytes(len);
      const pr = new BitReader(payloadBytes);
      pr.enterNested();
      const snapshot = decodeMemorySnapshot(pr);
      pr.leaveNested();
      pr.flushToByteBoundary();
      return { tag: "Memory", snapshot };
    }
    case 2: {
      const payloadBytes = r.readRawBytes(len);
      const pr = new BitReader(payloadBytes);
      const disks_len = pr.readLeb128();
      const disks = [];
      for (let i = 0; i < disks_len; i++) {
        pr.enterNested();
        const disks_item = decodeDiskInfo(pr);
        pr.leaveNested();
        disks.push(disks_item);
      }
      pr.flushToByteBoundary();
      return { tag: "Disks", disks };
    }
    case 3: {
      const payloadBytes = r.readRawBytes(len);
      const pr = new BitReader(payloadBytes);
      const interfaces_len = pr.readLeb128();
      const interfaces = [];
      for (let i = 0; i < interfaces_len; i++) {
        pr.enterNested();
        const interfaces_item = decodeNetworkInfo(pr);
        pr.leaveNested();
        interfaces.push(interfaces_item);
      }
      pr.flushToByteBoundary();
      return { tag: "Network", interfaces };
    }
    case 4: {
      const payloadBytes = r.readRawBytes(len);
      const pr = new BitReader(payloadBytes);
      const top_len = pr.readLeb128();
      const top = [];
      for (let i = 0; i < top_len; i++) {
        pr.enterNested();
        const top_item = decodeProcessInfo(pr);
        pr.leaveNested();
        top.push(top_item);
      }
      pr.flushToByteBoundary();
      return { tag: "Processes", top };
    }
    case 5: {
      const payloadBytes = r.readRawBytes(len);
      const pr = new BitReader(payloadBytes);
      pr.enterNested();
      const info = decodeSystemInfo(pr);
      pr.leaveNested();
      pr.flushToByteBoundary();
      return { tag: "System", info };
    }
    default: {
      throw new Error(`Unknown TelemetryFrame discriminant: ${disc}`);
    }
  }
}

// frontend/app.ts
var totalBytes = 0;
var lastSecondBytes = 0;
var $ = (id) => document.getElementById(id);
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
function formatUptime(secs) {
  const d = Math.floor(secs / 86400);
  const h = Math.floor(secs % 86400 / 3600);
  const m = Math.floor(secs % 3600 / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
function barColor(pct) {
  if (pct >= 90) return "r";
  if (pct >= 70) return "a";
  return "g";
}
function setBar(id, pct, color) {
  const el = $(id);
  el.style.width = pct.toFixed(1) + "%";
  if (color) el.className = "bar-f " + color;
}
function renderCpu(frame, bytes) {
  const s = frame.snapshot;
  $("cpu-val").textContent = String(s.overall);
  setBar("cpu-bar", s.overall, barColor(s.overall));
  $("cpu-freq").textContent = String(s.frequency);
  $("cpu-bytes").textContent = String(bytes);
  const box = $("cores");
  while (box.children.length > s.per_core.length) box.lastChild.remove();
  s.per_core.forEach((u, i) => {
    let div = box.children[i];
    if (!div) {
      div = document.createElement("div");
      div.className = "core";
      const cb = document.createElement("div");
      cb.className = "cb";
      const cf = document.createElement("div");
      cf.className = "cf";
      cb.appendChild(cf);
      const cl = document.createElement("div");
      cl.className = "cl";
      div.appendChild(cb);
      div.appendChild(cl);
      box.appendChild(div);
    }
    div.querySelector(".cf").style.height = u + "%";
    div.querySelector(".cl").textContent = u + "%";
  });
}
function renderMemory(frame, bytes) {
  const s = frame.snapshot;
  const usedGB = (Number(s.used_bytes) / 1073741824).toFixed(1);
  const totalGB = (Number(s.total_bytes) / 1073741824).toFixed(1);
  const pct = Number(s.total_bytes) > 0 ? Number(s.used_bytes) / Number(s.total_bytes) * 100 : 0;
  $("mem-val").textContent = usedGB;
  setBar("mem-bar", pct, pct > 85 ? "r" : pct > 70 ? "a" : "bl");
  $("mem-detail").textContent = `${usedGB} / ${totalGB} GB (${pct.toFixed(1)}%)`;
  $("mem-bytes").textContent = String(bytes);
  $("mem-swap").textContent = formatBytes(Number(s.swap_used));
  $("mem-swap-total").textContent = formatBytes(Number(s.swap_total));
  $("mem-cached").textContent = formatBytes(Number(s.cached_bytes));
  const avail = Number(s.total_bytes) - Number(s.used_bytes);
  $("mem-avail").textContent = formatBytes(avail > 0 ? avail : 0);
}
function renderDisks(frame, bytes) {
  $("disk-bytes").textContent = String(bytes);
  const box = $("disks");
  box.textContent = "";
  for (const d of frame.disks) {
    const pct = d.total_gb > 0 ? d.used_gb / d.total_gb * 100 : 0;
    const row = document.createElement("div");
    row.className = "ur";
    const name = document.createElement("span");
    name.className = "un";
    name.textContent = d.name || d.mount;
    name.title = d.mount;
    const barWrap = document.createElement("span");
    barWrap.className = "ub";
    const barTrack = document.createElement("div");
    barTrack.className = "bar-t";
    const barFill = document.createElement("div");
    barFill.className = "bar-f " + barColor(pct);
    barFill.style.width = pct.toFixed(1) + "%";
    barTrack.appendChild(barFill);
    barWrap.appendChild(barTrack);
    const val = document.createElement("span");
    val.className = "uv";
    val.textContent = `${d.used_gb} / ${d.total_gb} GB`;
    row.appendChild(name);
    row.appendChild(barWrap);
    row.appendChild(val);
    box.appendChild(row);
  }
  if (frame.disks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "detail";
    empty.textContent = "No disks detected";
    box.appendChild(empty);
  }
}
function renderNetwork(frame, bytes) {
  $("net-bytes").textContent = String(bytes);
  const box = $("networks");
  box.textContent = "";
  for (const n of frame.interfaces) {
    const row = document.createElement("div");
    row.className = "ur";
    const name = document.createElement("span");
    name.className = "un";
    name.textContent = n.name;
    const info = document.createElement("span");
    info.className = "ub";
    info.style.fontFamily = "var(--mono)";
    info.style.fontSize = "0.68rem";
    info.style.color = "var(--text-dim)";
    info.textContent = `\u2193 ${formatBytes(Number(n.rx_bps))}/s  \u2191 ${formatBytes(Number(n.tx_bps))}/s`;
    const total = document.createElement("span");
    total.className = "uv";
    total.textContent = `${formatBytes(Number(n.total_rx))} total`;
    row.appendChild(name);
    row.appendChild(info);
    row.appendChild(total);
    box.appendChild(row);
  }
  if (frame.interfaces.length === 0) {
    const empty = document.createElement("div");
    empty.className = "detail";
    empty.textContent = "No interfaces detected";
    box.appendChild(empty);
  }
}
var lastProcesses = [];
var procSortCol = "cpu";
var procSortDir = "desc";
function renderProcesses(frame, bytes) {
  $("proc-bytes").textContent = String(bytes);
  lastProcesses = frame.top;
  $("proc-count").textContent = `(${frame.top.length})`;
  renderProcessTable();
}
function renderProcessTable() {
  const search = $("proc-search").value.toLowerCase();
  let procs = lastProcesses;
  if (search) {
    procs = procs.filter(
      (p) => p.name.toLowerCase().includes(search) || String(p.pid).includes(search)
    );
  }
  procs = [...procs].sort((a, b) => {
    let av, bv;
    switch (procSortCol) {
      case "pid":
        av = a.pid;
        bv = b.pid;
        break;
      case "name":
        av = a.name.toLowerCase();
        bv = b.name.toLowerCase();
        break;
      case "cpu":
        av = a.cpu_pct;
        bv = b.cpu_pct;
        break;
      case "mem":
        av = a.mem_mb;
        bv = b.mem_mb;
        break;
      default:
        av = a.cpu_pct;
        bv = b.cpu_pct;
    }
    if (av < bv) return procSortDir === "asc" ? -1 : 1;
    if (av > bv) return procSortDir === "asc" ? 1 : -1;
    return 0;
  });
  $("proc-showing").textContent = search ? `showing ${procs.length} of ${lastProcesses.length}` : `${procs.length} processes`;
  const tbody = $("procs");
  tbody.textContent = "";
  for (const p of procs) {
    const tr = document.createElement("tr");
    const tdPid = document.createElement("td");
    tdPid.className = "dm";
    tdPid.textContent = String(p.pid);
    const tdName = document.createElement("td");
    tdName.className = "nm";
    tdName.textContent = p.name;
    const tdCpu = document.createElement("td");
    tdCpu.className = "n";
    tdCpu.textContent = p.cpu_pct + "%";
    const tdMem = document.createElement("td");
    tdMem.className = "n";
    tdMem.textContent = p.mem_mb + " MB";
    tr.appendChild(tdPid);
    tr.appendChild(tdName);
    tr.appendChild(tdCpu);
    tr.appendChild(tdMem);
    tbody.appendChild(tr);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = $("proc-search");
  if (searchInput) {
    searchInput.addEventListener("input", renderProcessTable);
  }
  document.querySelectorAll(".sortable").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      if (procSortCol === col) {
        procSortDir = procSortDir === "desc" ? "asc" : "desc";
      } else {
        procSortCol = col;
        procSortDir = col === "name" ? "asc" : "desc";
      }
      document.querySelectorAll(".sortable").forEach((h) => {
        h.classList.remove("asc", "desc");
      });
      th.classList.add(procSortDir);
      renderProcessTable();
    });
  });
});
function renderSystem(frame) {
  const i = frame.info;
  $("sys-host").textContent = i.hostname;
  $("sys-os").textContent = `${i.os_name} ${i.os_version}`;
  $("sys-kernel").textContent = i.kernel;
  $("sys-cpu").textContent = `${i.cpu_brand} (${i.cpu_count} cores)`;
  $("sys-uptime").textContent = formatUptime(Number(i.uptime_secs));
}
function connect() {
  const el = $("status");
  el.textContent = "connecting";
  el.className = "badge connecting";
  const ws = new WebSocket(`ws://${location.host}/ws`);
  ws.binaryType = "arraybuffer";
  ws.onopen = () => {
    const hs = new SchemaHandshake(SCHEMA_HASH, "0.1.0");
    ws.send(hs.encode());
    el.textContent = "handshake";
  };
  ws.onmessage = (e) => {
    if (typeof e.data === "string") {
      el.textContent = e.data;
      el.className = "badge error";
      ws.close();
      return;
    }
    el.textContent = "live";
    el.className = "badge live";
    const bytes = new Uint8Array(e.data);
    const size = bytes.length;
    totalBytes += size;
    lastSecondBytes += size;
    try {
      const r = new BitReader(bytes);
      const frame = decodeTelemetryFrame(r);
      switch (frame.tag) {
        case "Cpu":
          renderCpu(frame, size);
          break;
        case "Memory":
          renderMemory(frame, size);
          break;
        case "Disks":
          renderDisks(frame, size);
          break;
        case "Network":
          renderNetwork(frame, size);
          break;
        case "Processes":
          renderProcesses(frame, size);
          break;
        case "System":
          renderSystem(frame);
          break;
      }
      $("update-time").textContent = (/* @__PURE__ */ new Date()).toLocaleTimeString();
    } catch (err) {
      console.error("decode error", err);
    }
  };
  ws.onclose = () => {
    el.textContent = "disconnected";
    el.className = "badge error";
    setTimeout(connect, 2e3);
  };
  ws.onerror = () => ws.close();
}
setInterval(() => {
  const bps = lastSecondBytes;
  const jsonEstimate = bps * 12;
  $("wire-bps").textContent = String(bps);
  $("json-equiv").textContent = `~${jsonEstimate}`;
  $("savings").textContent = jsonEstimate > 0 ? `${((1 - bps / jsonEstimate) * 100).toFixed(0)}%` : "--";
  lastSecondBytes = 0;
}, 1e3);
connect();
