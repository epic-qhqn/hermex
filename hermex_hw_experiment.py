#!/usr/bin/env python3
"""
hermex_hw_experiment.py

Thu thap du lieu thu nghiem phan cung cho Hermex khi CA HAI board ESP32
(Alice va Bob) cung cam vao MOT laptop.

Voi moi cap (goc Alice, goc Bob) script gui lenh goc cho tung board,
doc gia tri LDR tu board Bob nhieu lan, roi luu:
    raw.csv      moi lan do mot dong
    summary.csv  trung binh, do lech chuan, min, max, ti le so voi muc cao nhat,
                 va gia tri ly thuyet cos^2 de doi chieu
    meta.json    tham so thi nghiem, cong COM, ngay gio, commit git, nguong LDR

Chay thu khong can phan cung:
    python hermex_hw_experiment.py --simulate --repeats 5

Chay that:
    python hermex_hw_experiment.py --alice-port COM5 --bob-port COM7 \
        --condition laser_on --tag phong_hoc_den_tat --repeats 20

Do nen ben trong (tat laser) de co baseline:
    python hermex_hw_experiment.py --alice-port COM5 --bob-port COM7 \
        --condition laser_off --tag nen --repeats 20
"""

import argparse
import csv
import json
import math
import os
import platform
import random
import statistics
import subprocess
import sys
import time
from datetime import datetime

VALID_ANGLES = (0, 45, 90, 135)


class Board:
    def __init__(self, ser, name):
        self.ser = ser
        self.name = name

    def command(self, angle, expect, timeout=4.0):
        self.ser.reset_input_buffer()
        self.ser.write(f"{angle}\n".encode("ascii"))
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            raw = self.ser.readline()
            if not raw:
                continue
            try:
                line = raw.decode("utf-8", errors="strict").strip()
            except UnicodeDecodeError:
                continue
            if line.startswith("ERR:"):
                raise RuntimeError(f"{self.name} bao loi: {line}")
            if line.startswith(expect):
                return line
        raise TimeoutError(
            f"{self.name} khong tra loi '{expect}' trong {timeout}s. "
            f"Kiem tra cong COM, firmware da nap dung file, va Serial Monitor da dong."
        )


class FakeSerial:
    def __init__(self, kind, state, condition):
        self.kind = kind
        self.state = state
        self.condition = condition
        self.buf = []

    def reset_input_buffer(self):
        self.buf = []

    def write(self, data):
        angle = int(data.decode("ascii").strip())
        if self.kind == "alice":
            self.state["A"] = angle
            self.buf.append(f"OK:{angle}\n".encode())
        else:
            self.state["B"] = angle
            ambient = 600
            signal = 0
            if self.condition == "laser_on":
                delta = math.radians(self.state.get("A", 0) - angle)
                signal = 2400 * math.cos(delta) ** 2
            value = int(max(0, min(4095, ambient + signal + random.gauss(0, 25))))
            self.buf.append(f"LDR:{value}\n".encode())

    def readline(self):
        return self.buf.pop(0) if self.buf else b""

    def close(self):
        pass


def git_commit():
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, timeout=5,
        )
        return out.stdout.strip() or None
    except Exception:
        return None


def read_threshold(path="config.json"):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f).get("ldr_calibration")
    except Exception:
        return None


def open_boards(args):
    if args.simulate:
        state = {}
        return (
            Board(FakeSerial("alice", state, args.condition), "Alice"),
            Board(FakeSerial("bob", state, args.condition), "Bob"),
        )
    import serial
    a = serial.Serial(args.alice_port, 115200, timeout=1)
    b = serial.Serial(args.bob_port, 115200, timeout=1)
    time.sleep(2.0)
    a.reset_input_buffer()
    b.reset_input_buffer()
    return Board(a, "Alice"), Board(b, "Bob")


def main():
    p = argparse.ArgumentParser(description="Thu thap du lieu LDR theo cap goc Alice x Bob")
    p.add_argument("--alice-port", help="Cong COM cua board Alice, vi du COM5")
    p.add_argument("--bob-port", help="Cong COM cua board Bob, vi du COM7")
    p.add_argument("--angles", type=int, nargs="+", default=list(VALID_ANGLES))
    p.add_argument("--repeats", type=int, default=20, help="So lan do moi cap goc")
    p.add_argument("--condition", default="laser_on", help="Ghi chu dieu kien, vi du laser_on, laser_off")
    p.add_argument("--tag", default="", help="Ten ngan cho phien do")
    p.add_argument("--out", default="data", help="Thu muc goc luu du lieu")
    p.add_argument("--settle", type=float, default=0.4, help="Giay cho sau khi doi goc Alice")
    p.add_argument("--simulate", action="store_true", help="Chay mo phong, khong can phan cung")
    args = p.parse_args()

    for a in args.angles:
        if a not in VALID_ANGLES:
            sys.exit(f"Goc {a} khong hop le. Chi dung {VALID_ANGLES}.")
    if not args.simulate and not (args.alice_port and args.bob_port):
        sys.exit("Can --alice-port va --bob-port (hoac dung --simulate).")

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    name = stamp + (f"_{args.tag}" if args.tag else "")
    out_dir = os.path.join(args.out, name)
    os.makedirs(out_dir, exist_ok=True)

    alice, bob = open_boards(args)
    rows = []
    t0 = time.time()
    try:
        for a in args.angles:
            alice.command(a, "OK:")
            time.sleep(0 if args.simulate else args.settle)
            for b in args.angles:
                for r in range(1, args.repeats + 1):
                    line = bob.command(b, "LDR:")
                    value = int(line.split(":", 1)[1])
                    rows.append({
                        "timestamp": datetime.now().isoformat(timespec="milliseconds"),
                        "condition": args.condition,
                        "alice_angle": a,
                        "bob_angle": b,
                        "delta_angle": abs(a - b),
                        "repeat": r,
                        "ldr": value,
                    })
                print(f"Alice {a:>3} | Bob {b:>3} | da do {args.repeats} lan")
    finally:
        for board in (alice, bob):
            try:
                board.ser.close()
            except Exception:
                pass

    raw_path = os.path.join(out_dir, "raw.csv")
    with open(raw_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    cells = {}
    for row in rows:
        cells.setdefault((row["alice_angle"], row["bob_angle"]), []).append(row["ldr"])
    means = {k: statistics.mean(v) for k, v in cells.items()}
    top = max(means.values())

    summary_path = os.path.join(out_dir, "summary.csv")
    with open(summary_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["alice_angle", "bob_angle", "delta_angle", "n", "mean", "stdev",
                    "min", "max", "ratio_to_max", "cos2_theory"])
        for (a, b), vals in sorted(cells.items()):
            sd = statistics.stdev(vals) if len(vals) > 1 else 0.0
            w.writerow([
                a, b, abs(a - b), len(vals),
                round(statistics.mean(vals), 1), round(sd, 1),
                min(vals), max(vals),
                round(means[(a, b)] / top, 3) if top else "",
                round(math.cos(math.radians(a - b)) ** 2, 3),
            ])

    meta = {
        "name": name,
        "condition": args.condition,
        "tag": args.tag,
        "angles": args.angles,
        "repeats": args.repeats,
        "settle_s": args.settle,
        "alice_port": args.alice_port,
        "bob_port": args.bob_port,
        "simulated": args.simulate,
        "duration_s": round(time.time() - t0, 1),
        "python": platform.python_version(),
        "git_commit": git_commit(),
        "ldr_calibration": read_threshold(),
    }
    with open(os.path.join(out_dir, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print()
    print("Trung binh LDR (hang: Alice, cot: Bob)")
    print("Alice\\Bob " + "".join(f"{b:>8}" for b in args.angles))
    for a in args.angles:
        print(f"{a:>9} " + "".join(f"{means[(a, b)]:>8.0f}" for b in args.angles))

    matched = [means[(a, a)] for a in args.angles if (a, a) in means]
    crossed = [means[(a, b)] for a in args.angles for b in args.angles
               if abs(a - b) == 90 and (a, b) in means]
    if matched and crossed and statistics.mean(crossed) > 0:
        ratio = statistics.mean(matched) / statistics.mean(crossed)
        print()
        print(f"Ti so cung huong / vuong goc: {ratio:.1f} (cang cao, hai phim cang tach bach)")
    print(f"Da luu vao: {out_dir}")


if __name__ == "__main__":
    main()
