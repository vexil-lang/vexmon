import { BitReader, SchemaHandshake } from '@vexil-lang/runtime';
import { SCHEMA_HASH, decodeTelemetryFrame, type TelemetryFrame } from './generated.js';

// State
let totalBytes = 0;
let lastSecondBytes = 0;
const bpsHistory: number[] = [];
const BPS_WINDOW = 5; // 5-second rolling average

const $ = (id: string) => document.getElementById(id)!;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatUptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function barColor(pct: number): string {
  if (pct >= 90) return 'r';
  if (pct >= 70) return 'a';
  return 'g';
}

function setBar(id: string, pct: number, color?: string) {
  const el = $(id);
  el.style.width = pct.toFixed(1) + '%';
  if (color) el.className = 'bar-f ' + color;
}

// Renderers
function renderCpu(frame: TelemetryFrame & { tag: 'Cpu' }, bytes: number) {
  const s = frame.snapshot;
  $('cpu-val').textContent = String(s.overall);
  setBar('cpu-bar', s.overall, barColor(s.overall));
  $('cpu-freq').textContent = String(s.frequency);
  $('cpu-bytes').textContent = String(bytes);

  const box = $('cores');
  while (box.children.length > s.per_core.length) box.lastChild!.remove();
  s.per_core.forEach((u: number, i: number) => {
    let div = box.children[i] as HTMLElement;
    if (!div) {
      div = document.createElement('div');
      div.className = 'core';
      const cb = document.createElement('div');
      cb.className = 'cb';
      const cf = document.createElement('div');
      cf.className = 'cf';
      cb.appendChild(cf);
      const cl = document.createElement('div');
      cl.className = 'cl';
      div.appendChild(cb);
      div.appendChild(cl);
      box.appendChild(div);
    }
    (div.querySelector('.cf') as HTMLElement).style.height = u + '%';
    (div.querySelector('.cl') as HTMLElement).textContent = u + '%';
  });
}

function renderMemory(frame: TelemetryFrame & { tag: 'Memory' }, bytes: number) {
  const s = frame.snapshot;
  const usedGB = (Number(s.used_bytes) / 1073741824).toFixed(1);
  const totalGB = (Number(s.total_bytes) / 1073741824).toFixed(1);
  const pct = Number(s.total_bytes) > 0 ? (Number(s.used_bytes) / Number(s.total_bytes) * 100) : 0;

  $('mem-val').textContent = usedGB;
  setBar('mem-bar', pct, pct > 85 ? 'r' : pct > 70 ? 'a' : 'bl');
  $('mem-detail').textContent = `${usedGB} / ${totalGB} GB (${pct.toFixed(1)}%)`;
  $('mem-bytes').textContent = String(bytes);
  $('mem-swap').textContent = formatBytes(Number(s.swap_used));
  $('mem-swap-total').textContent = formatBytes(Number(s.swap_total));
  $('mem-cached').textContent = formatBytes(Number(s.cached_bytes));
  const avail = Number(s.total_bytes) - Number(s.used_bytes);
  $('mem-avail').textContent = formatBytes(avail > 0 ? avail : 0);
}

function renderDisks(frame: TelemetryFrame & { tag: 'Disks' }, bytes: number) {
  $('disk-bytes').textContent = String(bytes);
  const box = $('disks');
  box.textContent = '';
  for (const d of frame.disks) {
    const pct = d.total_gb > 0 ? (d.used_gb / d.total_gb * 100) : 0;
    const row = document.createElement('div');
    row.className = 'ur';

    const name = document.createElement('span');
    name.className = 'un';
    name.textContent = d.name || d.mount;
    name.title = d.mount;

    const barWrap = document.createElement('span');
    barWrap.className = 'ub';
    const barTrack = document.createElement('div');
    barTrack.className = 'bar-t';
    const barFill = document.createElement('div');
    barFill.className = 'bar-f ' + barColor(pct);
    barFill.style.width = pct.toFixed(1) + '%';
    barTrack.appendChild(barFill);
    barWrap.appendChild(barTrack);

    const val = document.createElement('span');
    val.className = 'uv';
    val.textContent = `${d.used_gb} / ${d.total_gb} GB`;

    row.appendChild(name);
    row.appendChild(barWrap);
    row.appendChild(val);
    box.appendChild(row);
  }
  if (frame.disks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'detail';
    empty.textContent = 'No disks detected';
    box.appendChild(empty);
  }
}

function renderNetwork(frame: TelemetryFrame & { tag: 'Network' }, bytes: number) {
  $('net-bytes').textContent = String(bytes);
  const box = $('networks');
  box.textContent = '';
  for (const n of frame.interfaces) {
    const row = document.createElement('div');
    row.className = 'ur';

    const name = document.createElement('span');
    name.className = 'un';
    name.textContent = n.name;

    const info = document.createElement('span');
    info.className = 'ub';
    info.style.fontFamily = 'var(--mono)';
    info.style.fontSize = '0.68rem';
    info.style.color = 'var(--text-dim)';
    info.textContent = `\u2193 ${formatBytes(Number(n.rx_bps))}/s  \u2191 ${formatBytes(Number(n.tx_bps))}/s`;

    const total = document.createElement('span');
    total.className = 'uv';
    total.textContent = `${formatBytes(Number(n.total_rx))} total`;

    row.appendChild(name);
    row.appendChild(info);
    row.appendChild(total);
    box.appendChild(row);
  }
  if (frame.interfaces.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'detail';
    empty.textContent = 'No interfaces detected';
    box.appendChild(empty);
  }
}

// Process state
let lastProcesses: any[] = [];
let procSortCol = 'cpu';
let procSortDir: 'asc' | 'desc' = 'desc';

function renderProcesses(frame: TelemetryFrame & { tag: 'Processes' }, bytes: number) {
  $('proc-bytes').textContent = String(bytes);
  lastProcesses = frame.top;
  $('proc-count').textContent = `(${frame.top.length})`;
  renderProcessTable();
}

function renderProcessTable() {
  const search = ($('proc-search') as HTMLInputElement).value.toLowerCase();
  let procs = lastProcesses;

  // Filter
  if (search) {
    procs = procs.filter((p: any) =>
      p.name.toLowerCase().includes(search) ||
      String(p.pid).includes(search)
    );
  }

  // Sort
  procs = [...procs].sort((a: any, b: any) => {
    let av: any, bv: any;
    switch (procSortCol) {
      case 'pid': av = a.pid; bv = b.pid; break;
      case 'name': av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
      case 'cpu': av = a.cpu_pct; bv = b.cpu_pct; break;
      case 'mem': av = a.mem_mb; bv = b.mem_mb; break;
      default: av = a.cpu_pct; bv = b.cpu_pct;
    }
    if (av < bv) return procSortDir === 'asc' ? -1 : 1;
    if (av > bv) return procSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  $('proc-showing').textContent = search
    ? `showing ${procs.length} of ${lastProcesses.length}`
    : `${procs.length} processes`;

  const tbody = $('procs');
  tbody.textContent = '';
  for (const p of procs) {
    const tr = document.createElement('tr');

    const tdPid = document.createElement('td');
    tdPid.className = 'dm';
    tdPid.textContent = String(p.pid);

    const tdName = document.createElement('td');
    tdName.className = 'nm';
    tdName.textContent = p.name;

    const tdCpu = document.createElement('td');
    tdCpu.className = 'n';
    tdCpu.textContent = p.cpu_pct + '%';

    const tdMem = document.createElement('td');
    tdMem.className = 'n';
    tdMem.textContent = p.mem_mb + ' MB';

    tr.appendChild(tdPid);
    tr.appendChild(tdName);
    tr.appendChild(tdCpu);
    tr.appendChild(tdMem);
    tbody.appendChild(tr);
  }
}

// Search input handler
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = $('proc-search') as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener('input', renderProcessTable);
  }

  // Sort column click handlers
  document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = (th as HTMLElement).dataset.col!;
      if (procSortCol === col) {
        procSortDir = procSortDir === 'desc' ? 'asc' : 'desc';
      } else {
        procSortCol = col;
        procSortDir = col === 'name' ? 'asc' : 'desc';
      }
      // Update header classes
      document.querySelectorAll('.sortable').forEach(h => {
        h.classList.remove('asc', 'desc');
      });
      th.classList.add(procSortDir);
      renderProcessTable();
    });
  });
});

function renderSystem(frame: TelemetryFrame & { tag: 'System' }) {
  const i = frame.info;
  $('sys-host').textContent = i.hostname;
  $('sys-os').textContent = `${i.os_name} ${i.os_version}`;
  $('sys-kernel').textContent = i.kernel;
  $('sys-cpu').textContent = `${i.cpu_brand} (${i.cpu_count} cores)`;
  $('sys-uptime').textContent = formatUptime(Number(i.uptime_secs));
}

// WebSocket
function connect() {
  const el = $('status');
  el.textContent = 'connecting';
  el.className = 'badge connecting';

  const ws = new WebSocket(`ws://${location.host}/ws`);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    const hs = new SchemaHandshake(SCHEMA_HASH, '0.1.0');
    ws.send(hs.encode());
    el.textContent = 'handshake';
  };

  ws.onmessage = (e) => {
    if (typeof e.data === 'string') {
      el.textContent = e.data;
      el.className = 'badge error';
      ws.close();
      return;
    }

    el.textContent = 'live';
    el.className = 'badge live';

    const bytes = new Uint8Array(e.data);
    const size = bytes.length;
    totalBytes += size;
    lastSecondBytes += size;

    try {
      const r = new BitReader(bytes);
      const frame = decodeTelemetryFrame(r);

      switch (frame.tag) {
        case 'Cpu': renderCpu(frame, size); break;
        case 'Memory': renderMemory(frame, size); break;
        case 'Disks': renderDisks(frame, size); break;
        case 'Network': renderNetwork(frame, size); break;
        case 'Processes': renderProcesses(frame, size); break;
        case 'System': renderSystem(frame); break;
      }

      $('update-time').textContent = new Date().toLocaleTimeString();
    } catch (err) {
      console.error('decode error', err);
    }
  };

  ws.onclose = () => {
    el.textContent = 'disconnected';
    el.className = 'badge error';
    setTimeout(connect, 2000);
  };

  ws.onerror = () => ws.close();
}

// BPS tracker — 5-second rolling average + peak for context
let peakBps = 0;

setInterval(() => {
  bpsHistory.push(lastSecondBytes);
  if (bpsHistory.length > BPS_WINDOW) bpsHistory.shift();
  const avgBps = Math.round(bpsHistory.reduce((a, b) => a + b, 0) / bpsHistory.length);
  if (lastSecondBytes > peakBps) peakBps = lastSecondBytes;
  const jsonEstimate = avgBps * 12;
  $('wire-bps').textContent = String(avgBps);
  $('wire-peak').textContent = String(peakBps);
  $('json-equiv').textContent = `~${jsonEstimate}`;
  $('savings').textContent = jsonEstimate > 0 ? `${((1 - avgBps / jsonEstimate) * 100).toFixed(0)}%` : '--';
  lastSecondBytes = 0;
}, 1000);

connect();
