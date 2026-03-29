//! CPU collector — overall usage (%), per-core usage, and frequency.
//! Uses `System::global_cpu_usage` and `System::cpus` from sysinfo.

use crate::generated::CpuSnapshot;
use sysinfo::System;

pub fn collect(sys: &System) -> CpuSnapshot {
    let overall = sys.global_cpu_usage() as u8;
    let per_core: Vec<u8> = sys.cpus().iter().map(|c| c.cpu_usage() as u8).collect();
    let frequency = sys.cpus().first().map(|c| c.frequency() as u16).unwrap_or(0);
    CpuSnapshot {
        overall,
        per_core,
        frequency,
        _unknown: Vec::new(),
    }
}
