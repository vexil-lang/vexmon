//! Memory collector — used/total RAM, swap, and estimated cached bytes.
//! Uses `System::used_memory`, `total_memory`, `free_memory`, and swap APIs.

use crate::generated::MemorySnapshot;
use sysinfo::System;

pub fn collect(sys: &System) -> MemorySnapshot {
    MemorySnapshot {
        used_bytes: sys.used_memory(),
        total_bytes: sys.total_memory(),
        swap_used: sys.used_swap(),
        swap_total: sys.total_swap(),
        cached_bytes: sys
            .total_memory()
            .saturating_sub(sys.used_memory())
            .saturating_sub(sys.free_memory()),
        _unknown: Vec::new(),
    }
}
