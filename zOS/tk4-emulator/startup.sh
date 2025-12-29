#!/bin/bash
# Start stunnel for TN3270 TLS
stunnel /mvs/stunnel.conf &

# Start Hercules emulator
hercules -f /mvs/hercules.cnf
