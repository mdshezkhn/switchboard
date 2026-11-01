#!/usr/bin/env python3
"""Switchboard QA — screenshots, console errors, responsive + reduced-motion checks.

Run from the switchboard project root with the dev server (or a build) on :3011:
    C:\\Python314\\python.exe qa/qa.py
"""
import json
import pathlib
import sys
import time

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3011"
OUT = pathlib.Path(__file__).parent / "shots"
OUT.mkdir(exist_ok=True)

VIEWS = ["agents", "runs", "usage", "evals"]
issues: list[str] = []


def snap(page, name):
    page.screenshot(path=str(OUT / f"{name}.png"), full_page=False)
    print("shot:", name)


def check_console(errors):
    if errors:
        issues.append(f"{len(errors)} console errors: {errors[:3]}")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))

        page.goto(BASE, wait_until="networkidle", timeout=60_000)
        page.wait_for_timeout(2500)
        snap(page, "01-agents-t0")
        page.wait_for_timeout(6000)
        snap(page, "02-agents-t6")

        # select an agent node via its DOM chip
        chips = page.locator("[data-agent-chip]")
        n = chips.count()
        print("agent chips:", n)
        if n >= 3:
            chips.nth(2).click()
            page.wait_for_timeout(600)
            snap(page, "03-agents-selected")
        else:
            issues.append(f"expected >=3 agent chips, got {n}")

        # pause + speed controls
        pause = page.locator("button[aria-label*='Pause'], button[aria-label*='pause']")
        if pause.count():
            pause.first.click()
            page.wait_for_timeout(300)
        snap(page, "04-agents-paused")

        # keyboard nav to runs
        page.keyboard.press("2")
        page.wait_for_timeout(1200)
        snap(page, "05-runs")
        # pick a run, replay it
        rows = page.locator("[data-run-row]")
        print("run rows:", rows.count())
        if rows.count():
            rows.nth(1).click()
            page.wait_for_timeout(700)
            snap(page, "06-run-selected")
            replay = page.locator("button[aria-label*='eplay'], button:has-text('Replay')")
            if replay.count():
                replay.first.click()
                page.wait_for_timeout(900)
                snap(page, "07-replay-mid")
                page.wait_for_timeout(3200)

        page.keyboard.press("3")
        page.wait_for_timeout(1200)
        snap(page, "08-usage")
        # toggle grouping
        group = page.locator("button:text-is('By agent')")
        if group.count():
            group.first.click()
            page.wait_for_timeout(700)
            snap(page, "09-usage-by-agent")

        page.keyboard.press("4")
        page.wait_for_timeout(1200)
        snap(page, "10-evals")
        # click a version cell to compare
        ver = page.locator("button[aria-label*='Compare']")
        if ver.count() >= 4:
            ver.nth(4).click()
            page.wait_for_timeout(700)
            snap(page, "11-evals-compare")
        # open regression run
        reg = page.locator("button:has-text('View run')")
        if not reg.count():
            reg = page.locator("a:has-text('run'), button:has-text('run')")
        if reg.count():
            reg.first.click()
            page.wait_for_timeout(1200)
            snap(page, "12-evals-to-run")

        check_console(errors)

        # responsive
        for w, h, tag in [(390, 844, "m"), (768, 1024, "t")]:
            pg2 = browser.new_context(viewport={"width": w, "height": h}).new_page()
            err2 = []
            pg2.on("console", lambda m, e=err2: e.append(m.text) if m.type == "error" else None)
            pg2.on("pageerror", lambda e, x=err2: x.append(str(e)))
            pg2.goto(BASE, wait_until="networkidle", timeout=60_000)
            pg2.wait_for_timeout(1800)
            snap(pg2, f"13-mobile-{tag}" if tag == "m" else f"14-tablet-{tag}")
            overflow = pg2.evaluate(
                "document.documentElement.scrollWidth - document.documentElement.clientWidth"
            )
            if overflow > 1:
                issues.append(f"{tag}: horizontal overflow {overflow}px")
            pg2.keyboard.press("2")
            pg2.wait_for_timeout(900)
            snap(pg2, f"15-{tag}-runs")
            if err2:
                issues.append(f"{tag} view console errors: {err2[:2]}")
            pg2.context.close()

        # reduced motion
        rm = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
        pg3 = rm.new_page()
        err3 = []
        pg3.on("console", lambda m: err3.append(m.text) if m.type == "error" else None)
        pg3.on("pageerror", lambda e: err3.append(str(e)))
        pg3.goto(BASE, wait_until="networkidle", timeout=60_000)
        pg3.wait_for_timeout(1500)
        snap(pg3, "16-reduced-agents")
        pg3.keyboard.press("2")
        pg3.wait_for_timeout(800)
        snap(pg3, "17-reduced-runs")
        if err3:
            issues.append(f"reduced-motion console errors: {err3[:2]}")
        rm.close()

        browser.close()

    print("\n==== RESULT ====")
    if issues:
        print("ISSUES:")
        for i in issues:
            print(" -", i)
        sys.exit(1)
    print("ALL CHECKS PASSED")


if __name__ == "__main__":
    main()
