use crate::generated::{ProcessInfo, ProcessState};
use sysinfo::{ProcessStatus, System};

pub fn collect(sys: &System, top_n: usize) -> Vec<ProcessInfo> {
    let mut procs: Vec<_> = sys.processes().values().collect();
    procs.sort_by(|a, b| {
        b.cpu_usage()
            .partial_cmp(&a.cpu_usage())
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    procs
        .iter()
        .take(top_n)
        .map(|p| {
            let state = match p.status() {
                ProcessStatus::Run => ProcessState::Running,
                ProcessStatus::Sleep => ProcessState::Sleeping,
                ProcessStatus::Stop => ProcessState::Stopped,
                ProcessStatus::Zombie => ProcessState::Zombie,
                _ => ProcessState::Unknown,
            };
            ProcessInfo {
                pid: p.pid().as_u32(),
                name: p.name().to_string_lossy().to_string(),
                cpu_pct: p.cpu_usage() as u8,
                mem_mb: (p.memory() / 1_048_576) as u32,
                state,
                _unknown: Vec::new(),
            }
        })
        .collect()
}
