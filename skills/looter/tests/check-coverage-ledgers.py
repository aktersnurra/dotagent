#!/usr/bin/env python3
"""Verify the coverage-ledger examples remain internally consistent."""

import json
import re
from pathlib import Path

coverage = Path(__file__).parents[1] / "references" / "coverage.md"
try:
    text = coverage.read_text()
    ledgers = [
        json.loads(block)
        for block in re.findall(r"```json\n(.*?)\n```", text, re.DOTALL)
    ]
except (OSError, json.JSONDecodeError) as error:
    raise AssertionError(f"cannot read coverage ledger examples: {error}") from error

required_sources = {"Wayke", "Blocket", "Bytbil", "Bilweb"}

partial_ledgers = [
    ledger
    for ledger in ledgers
    if any(source["status"] != "covered" for source in ledger["sources"])
]
assert partial_ledgers, "coverage.md must include a partial ledger example"
assert all(
    ledger["complete"] == False for ledger in partial_ledgers
), "a ledger with a partial source must set complete to false"

complete_ledgers = [ledger for ledger in ledgers if ledger["complete"] == True]
assert (
    len(complete_ledgers) == 1
), "coverage.md must include one complete ledger example"
complete_ledger = complete_ledgers[0]
assert (
    {source["name"] for source in complete_ledger["sources"]} == required_sources
), "the complete ledger must include Wayke, Blocket, Bytbil, and Bilweb"
assert all(
    source["status"] == "covered" for source in complete_ledger["sources"]
), "every source in the complete ledger must be covered"

print("coverage ledger examples are internally consistent")
