//! Network collector — per-interface RX/TX rates and totals.
//! Uses `sysinfo::Networks` to enumerate active network interfaces.

use crate::generated::NetworkInfo;
use sysinfo::Networks;

pub fn collect(networks: &Networks) -> Vec<NetworkInfo> {
    networks
        .iter()
        .map(|(name, data)| NetworkInfo {
            name: name.to_string(),
            rx_bps: data.received(),
            tx_bps: data.transmitted(),
            total_rx: data.total_received(),
            total_tx: data.total_transmitted(),
            _unknown: Vec::new(),
        })
        .collect()
}
