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
var SCHEMA_HASH = new Uint8Array([135, 231, 108, 11, 194, 9, 3, 11, 12, 47, 11, 217, 31, 43, 29, 242, 48, 205, 120, 86, 13, 72, 173, 148, 146, 238, 178, 70, 50, 51, 148, 39]);
function encodeCpuSnapshot(v, w) {
  w.writeLeb128(v.overall);
  w.writeLeb128(v.per_core.length);
  for (const item of v.per_core) {
    w.writeU8(item);
  }
  w.writeLeb128(v.frequency);
  w.flushToByteBoundary();
  if (v._unknown.length > 0) {
    w.writeRawBytes(v._unknown);
  }
}
function decodeCpuSnapshot(r) {
  const overall = r.readLeb128();
  const per_core_len = r.readLeb128();
  const per_core = [];
  for (let i = 0; i < per_core_len; i++) {
    const per_core_item = r.readU8();
    per_core.push(per_core_item);
  }
  const frequency = r.readLeb128();
  r.flushToByteBoundary();
  const _unknown = r.readRemaining();
  return { overall, per_core, frequency, _unknown };
}
var CpuSnapshotEncoder = class {
  prevoverall = 0;
  prevfrequency = 0;
  encode(v, w) {
    const delta_overall = v.overall - this.prevoverall & 255;
    w.writeLeb128(delta_overall);
    this.prevoverall = v.overall;
    w.writeLeb128(v.per_core.length);
    for (const item of v.per_core) {
      w.writeU8(item);
    }
    const delta_frequency = v.frequency - this.prevfrequency & 65535;
    w.writeLeb128(delta_frequency);
    this.prevfrequency = v.frequency;
    w.flushToByteBoundary();
    if (v._unknown.length > 0) {
      w.writeRawBytes(v._unknown);
    }
  }
  reset() {
    this.prevoverall = 0;
    this.prevfrequency = 0;
  }
};
var CpuSnapshotDecoder = class {
  prevoverall = 0;
  prevfrequency = 0;
  decode(r) {
    const delta_overall = r.readLeb128();
    const overall = this.prevoverall + delta_overall & 255;
    this.prevoverall = overall;
    const per_core_len = r.readLeb128();
    const per_core = [];
    for (let i = 0; i < per_core_len; i++) {
      const per_core_item = r.readU8();
      per_core.push(per_core_item);
    }
    const delta_frequency = r.readLeb128();
    const frequency = this.prevfrequency + delta_frequency & 65535;
    this.prevfrequency = frequency;
    r.flushToByteBoundary();
    const _unknown = r.readRemaining();
    return { overall, per_core, frequency, _unknown };
  }
  reset() {
    this.prevoverall = 0;
    this.prevfrequency = 0;
  }
};
function encodeMemorySnapshot(v, w) {
  w.writeLeb12864(v.used_bytes);
  w.writeLeb12864(v.total_bytes);
  w.writeLeb12864(v.swap_used);
  w.writeLeb12864(v.swap_total);
  w.writeLeb12864(v.cached_bytes);
  w.flushToByteBoundary();
  if (v._unknown.length > 0) {
    w.writeRawBytes(v._unknown);
  }
}
function decodeMemorySnapshot(r) {
  const used_bytes = r.readLeb12864();
  const total_bytes = r.readLeb12864();
  const swap_used = r.readLeb12864();
  const swap_total = r.readLeb12864();
  const cached_bytes = r.readLeb12864();
  r.flushToByteBoundary();
  const _unknown = r.readRemaining();
  return { used_bytes, total_bytes, swap_used, swap_total, cached_bytes, _unknown };
}
var MemorySnapshotEncoder = class {
  prevusedBytes = 0n;
  prevtotalBytes = 0n;
  prevswapUsed = 0n;
  prevswapTotal = 0n;
  prevcachedBytes = 0n;
  encode(v, w) {
    const delta_used_bytes = BigInt.asUintN(64, v.used_bytes - this.prevusedBytes);
    w.writeLeb12864(delta_used_bytes);
    this.prevusedBytes = v.used_bytes;
    const delta_total_bytes = BigInt.asUintN(64, v.total_bytes - this.prevtotalBytes);
    w.writeLeb12864(delta_total_bytes);
    this.prevtotalBytes = v.total_bytes;
    const delta_swap_used = BigInt.asUintN(64, v.swap_used - this.prevswapUsed);
    w.writeLeb12864(delta_swap_used);
    this.prevswapUsed = v.swap_used;
    const delta_swap_total = BigInt.asUintN(64, v.swap_total - this.prevswapTotal);
    w.writeLeb12864(delta_swap_total);
    this.prevswapTotal = v.swap_total;
    const delta_cached_bytes = BigInt.asUintN(64, v.cached_bytes - this.prevcachedBytes);
    w.writeLeb12864(delta_cached_bytes);
    this.prevcachedBytes = v.cached_bytes;
    w.flushToByteBoundary();
    if (v._unknown.length > 0) {
      w.writeRawBytes(v._unknown);
    }
  }
  reset() {
    this.prevusedBytes = 0n;
    this.prevtotalBytes = 0n;
    this.prevswapUsed = 0n;
    this.prevswapTotal = 0n;
    this.prevcachedBytes = 0n;
  }
};
var MemorySnapshotDecoder = class {
  prevusedBytes = 0n;
  prevtotalBytes = 0n;
  prevswapUsed = 0n;
  prevswapTotal = 0n;
  prevcachedBytes = 0n;
  decode(r) {
    const delta_used_bytes = r.readLeb12864();
    const used_bytes = BigInt.asUintN(64, this.prevusedBytes + delta_used_bytes);
    this.prevusedBytes = used_bytes;
    const delta_total_bytes = r.readLeb12864();
    const total_bytes = BigInt.asUintN(64, this.prevtotalBytes + delta_total_bytes);
    this.prevtotalBytes = total_bytes;
    const delta_swap_used = r.readLeb12864();
    const swap_used = BigInt.asUintN(64, this.prevswapUsed + delta_swap_used);
    this.prevswapUsed = swap_used;
    const delta_swap_total = r.readLeb12864();
    const swap_total = BigInt.asUintN(64, this.prevswapTotal + delta_swap_total);
    this.prevswapTotal = swap_total;
    const delta_cached_bytes = r.readLeb12864();
    const cached_bytes = BigInt.asUintN(64, this.prevcachedBytes + delta_cached_bytes);
    this.prevcachedBytes = cached_bytes;
    r.flushToByteBoundary();
    const _unknown = r.readRemaining();
    return { used_bytes, total_bytes, swap_used, swap_total, cached_bytes, _unknown };
  }
  reset() {
    this.prevusedBytes = 0n;
    this.prevtotalBytes = 0n;
    this.prevswapUsed = 0n;
    this.prevswapTotal = 0n;
    this.prevcachedBytes = 0n;
  }
};
function encodeDiskInfo(v, w) {
  w.writeString(v.name);
  w.writeString(v.mount);
  w.writeU32(v.total_gb);
  w.writeU32(v.used_gb);
  w.writeU64(v.read_bps);
  w.writeU64(v.write_bps);
  w.flushToByteBoundary();
  if (v._unknown.length > 0) {
    w.writeRawBytes(v._unknown);
  }
}
function decodeDiskInfo(r) {
  const name = r.readString();
  const mount = r.readString();
  const total_gb = r.readU32();
  const used_gb = r.readU32();
  const read_bps = r.readU64();
  const write_bps = r.readU64();
  r.flushToByteBoundary();
  const _unknown = r.readRemaining();
  return { name, mount, total_gb, used_gb, read_bps, write_bps, _unknown };
}
function encodeNetworkInfo(v, w) {
  w.writeString(v.name);
  w.writeU64(v.rx_bps);
  w.writeU64(v.tx_bps);
  w.writeU64(v.total_rx);
  w.writeU64(v.total_tx);
  w.flushToByteBoundary();
  if (v._unknown.length > 0) {
    w.writeRawBytes(v._unknown);
  }
}
function decodeNetworkInfo(r) {
  const name = r.readString();
  const rx_bps = r.readU64();
  const tx_bps = r.readU64();
  const total_rx = r.readU64();
  const total_tx = r.readU64();
  r.flushToByteBoundary();
  const _unknown = r.readRemaining();
  return { name, rx_bps, tx_bps, total_rx, total_tx, _unknown };
}
var ProcessState = {
  Running: "Running",
  Sleeping: "Sleeping",
  Stopped: "Stopped",
  Zombie: "Zombie",
  Unknown: "Unknown"
};
function encodeProcessState(v, w) {
  let disc;
  switch (v) {
    case "Running":
      disc = 0;
      break;
    case "Sleeping":
      disc = 1;
      break;
    case "Stopped":
      disc = 2;
      break;
    case "Zombie":
      disc = 3;
      break;
    case "Unknown":
      disc = 4;
      break;
    default:
      throw new Error(`Unknown ProcessState variant: ${v}`);
  }
  w.writeBits(disc, 3);
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
function encodeProcessInfo(v, w) {
  w.writeU32(v.pid);
  w.writeString(v.name);
  w.writeU8(v.cpu_pct);
  w.writeU32(v.mem_mb);
  w.enterNested();
  encodeProcessState(v.state, w);
  w.leaveNested();
  w.flushToByteBoundary();
  if (v._unknown.length > 0) {
    w.writeRawBytes(v._unknown);
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
  const _unknown = r.readRemaining();
  return { pid, name, cpu_pct, mem_mb, state, _unknown };
}
function encodeSystemInfo(v, w) {
  w.writeString(v.hostname);
  w.writeString(v.os_name);
  w.writeString(v.os_version);
  w.writeString(v.kernel);
  w.writeU64(v.uptime_secs);
  w.writeString(v.cpu_brand);
  w.writeU8(v.cpu_count);
  w.flushToByteBoundary();
  if (v._unknown.length > 0) {
    w.writeRawBytes(v._unknown);
  }
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
  const _unknown = r.readRemaining();
  return { hostname, os_name, os_version, kernel, uptime_secs, cpu_brand, cpu_count, _unknown };
}
function encodeTelemetryFrame(v, w) {
  w.flushToByteBoundary();
  switch (v.tag) {
    case "Cpu": {
      w.writeLeb128(0);
      const payloadW = new BitWriter();
      payloadW.enterNested();
      encodeCpuSnapshot(v.snapshot, payloadW);
      payloadW.leaveNested();
      payloadW.flushToByteBoundary();
      const payload = payloadW.finish();
      w.writeLeb128(payload.length);
      w.writeRawBytes(payload);
      break;
    }
    case "Memory": {
      w.writeLeb128(1);
      const payloadW = new BitWriter();
      payloadW.enterNested();
      encodeMemorySnapshot(v.snapshot, payloadW);
      payloadW.leaveNested();
      payloadW.flushToByteBoundary();
      const payload = payloadW.finish();
      w.writeLeb128(payload.length);
      w.writeRawBytes(payload);
      break;
    }
    case "Disks": {
      w.writeLeb128(2);
      const payloadW = new BitWriter();
      payloadW.writeLeb128(v.disks.length);
      for (const item of v.disks) {
        payloadW.enterNested();
        encodeDiskInfo(item, payloadW);
        payloadW.leaveNested();
      }
      payloadW.flushToByteBoundary();
      const payload = payloadW.finish();
      w.writeLeb128(payload.length);
      w.writeRawBytes(payload);
      break;
    }
    case "Network": {
      w.writeLeb128(3);
      const payloadW = new BitWriter();
      payloadW.writeLeb128(v.interfaces.length);
      for (const item of v.interfaces) {
        payloadW.enterNested();
        encodeNetworkInfo(item, payloadW);
        payloadW.leaveNested();
      }
      payloadW.flushToByteBoundary();
      const payload = payloadW.finish();
      w.writeLeb128(payload.length);
      w.writeRawBytes(payload);
      break;
    }
    case "Processes": {
      w.writeLeb128(4);
      const payloadW = new BitWriter();
      payloadW.writeLeb128(v.top.length);
      for (const item of v.top) {
        payloadW.enterNested();
        encodeProcessInfo(item, payloadW);
        payloadW.leaveNested();
      }
      payloadW.flushToByteBoundary();
      const payload = payloadW.finish();
      w.writeLeb128(payload.length);
      w.writeRawBytes(payload);
      break;
    }
    case "System": {
      w.writeLeb128(5);
      const payloadW = new BitWriter();
      payloadW.enterNested();
      encodeSystemInfo(v.info, payloadW);
      payloadW.leaveNested();
      payloadW.flushToByteBoundary();
      const payload = payloadW.finish();
      w.writeLeb128(payload.length);
      w.writeRawBytes(payload);
      break;
    }
  }
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
export {
  BitReader,
  CpuSnapshotDecoder,
  CpuSnapshotEncoder,
  MemorySnapshotDecoder,
  MemorySnapshotEncoder,
  ProcessState,
  SCHEMA_HASH,
  SchemaHandshake,
  decodeCpuSnapshot,
  decodeDiskInfo,
  decodeMemorySnapshot,
  decodeNetworkInfo,
  decodeProcessInfo,
  decodeProcessState,
  decodeSystemInfo,
  decodeTelemetryFrame,
  encodeCpuSnapshot,
  encodeDiskInfo,
  encodeMemorySnapshot,
  encodeNetworkInfo,
  encodeProcessInfo,
  encodeProcessState,
  encodeSystemInfo,
  encodeTelemetryFrame
};
