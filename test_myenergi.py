#!/usr/bin/env python3
"""Quick test script for MyEnergi API authentication."""

import os
import requests
from requests.auth import HTTPDigestAuth

# Hub serial number (username) - found on hub or in myenergi app
SERIAL = os.environ.get("MYENERGI_SERIAL")
# API key from myaccount.myenergi.com → Products → Advanced → Generate API key
API_KEY = os.environ.get("MYENERGI_API_KEY")

if not SERIAL or not API_KEY:
    print("Set MYENERGI_SERIAL and MYENERGI_API_KEY environment variables")
    exit(1)

session = requests.Session()
session.auth = HTTPDigestAuth(SERIAL, API_KEY)

# Get assigned server from director
resp = session.get("https://director.myenergi.net/cgi-jstatus-*", timeout=10)

if "x_myenergi-asn" in resp.headers:
    server = resp.headers["x_myenergi-asn"]
    resp = session.get(f"https://{server}/cgi-jstatus-*", timeout=10)

print(resp.json())
