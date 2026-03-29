//! System metric collectors.
//!
//! Each sub-module reads one category of host metrics from [`sysinfo`] and
//! returns the corresponding Vexil-generated struct ready for `Pack`.

pub mod cpu;
pub mod disk;
pub mod memory;
pub mod network;
pub mod process;
pub mod system;
