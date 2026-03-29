use crate::generated::DiskInfo;
use sysinfo::Disks;

pub fn collect(disks: &Disks) -> Vec<DiskInfo> {
    disks
        .iter()
        .map(|d| {
            let total = d.total_space();
            let used = total.saturating_sub(d.available_space());
            DiskInfo {
                name: d.name().to_string_lossy().to_string(),
                mount: d.mount_point().to_string_lossy().to_string(),
                total_gb: (total / 1_073_741_824) as u32,
                used_gb: (used / 1_073_741_824) as u32,
                read_bps: 0,
                write_bps: 0,
                _unknown: Vec::new(),
            }
        })
        .collect()
}
