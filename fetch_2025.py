#!/usr/bin/env python3
"""Fetch MyEnergi yearly totals for 2025."""

import requests
from requests.auth import HTTPDigestAuth
from datetime import date, timedelta
import time

SERIAL = "21479935"
ZAPPI = "21962448"
API_KEY = "HjZozy2wGQRN07Pk4zzelswr"
SERVER = "s18.myenergi.net"

session = requests.Session()
session.auth = HTTPDigestAuth(SERIAL, API_KEY)

totals = {"imp": 0, "exp": 0, "gep": 0, "gen": 0, "h1d": 0, "h1b": 0}

start = date(2025, 1, 1)
end = date(2025, 12, 31)
current = start
days_processed = 0

while current <= end:
    date_str = current.strftime("%Y-%m-%d")
    url = f"https://{SERVER}/cgi-jday-Z{ZAPPI}-{date_str}"

    try:
        resp = session.get(url, timeout=30)
        if resp.ok and resp.text:
            data = resp.json()
            key = f"U{ZAPPI}"
            if key in data:
                for reading in data[key]:
                    for field in totals:
                        if field in reading:
                            totals[field] += reading[field]
            days_processed += 1
    except Exception as e:
        print(f"Error {date_str}: {e}")

    if current.day == 1:
        print(f"{current.strftime('%B %Y')}... ({days_processed} days)")

    current += timedelta(days=1)
    time.sleep(0.1)  # Rate limit

print(f"\n=== 2025 Totals ({days_processed} days) ===")
print(f"Import (from grid): {totals['imp'] / 3600000:.1f} kWh")
print(f"Export (to grid):   {totals['exp'] / 3600000:.1f} kWh")
print(f"Generation (solar): {totals['gep'] / 3600000:.1f} kWh")
consumption = totals['imp'] + totals['gep'] - totals['exp']
print(f"Consumption (est.): {consumption / 3600000:.1f} kWh")
