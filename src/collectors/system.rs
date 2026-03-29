//! System info collector — hostname, OS, kernel, CPU brand, core count, uptime.
//! Uses sysinfo static methods (`System::host_name`, etc.) plus per-CPU data.

use crate::generated::SystemInfo;
use sysinfo::System;

pub fn collect(sys: &System) -> SystemInfo {
    SystemInfo {
        hostname: System::host_name().unwrap_or_default(),
        os_name: System::name().unwrap_or_default(),
        os_version: System::os_version().unwrap_or_default(),
        kernel: System::kernel_version().unwrap_or_default(),
        uptime_secs: System::uptime(),
        cpu_brand: sys
            .cpus()
            .first()
            .map(|c| c.brand().to_string())
            .unwrap_or_default(),
        cpu_count: sys.cpus().len() as u8,
        _unknown: Vec::new(),
    }
}
