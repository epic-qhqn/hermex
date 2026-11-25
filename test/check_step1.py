#!/usr/bin/env python3
"""
check_step1.py

Kiem tra nhanh xem muc 1 (chuan bi moi truong) da xong chua.
Dat file nay o thu muc goc repo hermex, bat venv, roi chay:

    python check_step1.py

Khong ghi gi vao repo. Phan thu mo phong ghi tam vao thu muc tam roi xoa.
"""

import glob
import importlib
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
results = []


def report(ok, name, detail="", warn=False):
    mark = "OK  " if ok else ("CANH BAO" if warn else "LOI ")
    results.append((ok or warn, name))
    line = f"[{mark}] {name}"
    if detail:
        line += f" - {detail}"
    print(line)


def check_python():
    v = sys.version_info
    text = f"{v.major}.{v.minor}.{v.micro}"
    if (3, 9) <= (v.major, v.minor) <= (3, 13):
        report(True, "Python", text)
    else:
        report(False, "Python", f"{text}; nen dung 3.11 hoac 3.12", warn=True)


def check_venv():
    active = sys.prefix != getattr(sys, "base_prefix", sys.prefix)
    if active:
        report(True, "Moi truong ao (venv)", "dang bat")
    else:
        report(False, "Moi truong ao (venv)",
               "chua bat. Chay: venv\\Scripts\\activate", warn=True)


def check_git():
    path = shutil.which("git")
    if not path:
        report(False, "Git", "khong tim thay lenh git")
        return
    try:
        out = subprocess.run(["git", "--version"], capture_output=True,
                             text=True, timeout=10).stdout.strip()
    except Exception:
        out = path
    report(True, "Git", out)


def check_module(display, module, pip_name, version_attr=None, extra=None):
    try:
        mod = importlib.import_module(module)
    except Exception as exc:
        report(False, display, f"khong import duoc ({exc}). Chay: pip install {pip_name}")
        return
    if extra:
        problem = extra(mod)
        if problem:
            report(False, display, problem)
            return
    detail = ""
    if version_attr:
        detail = str(getattr(mod, version_attr, "?"))
    report(True, display, detail)


def serial_extra(mod):
    if not hasattr(mod, "Serial"):
        return ("co goi ten 'serial' khong dung. Chay: pip uninstall serial, "
                "roi pip install --force-reinstall pyserial")
    return None


def check_pyqt():
    try:
        from PyQt6 import QtCore
        report(True, "PyQt6", QtCore.PYQT_VERSION_STR)
    except Exception as exc:
        report(False, "PyQt6", f"khong import duoc ({exc}). Chay: pip install PyQt6")


def check_files():
    needed = [
        "config.py",
        "requirements.txt",
        os.path.join("ESP32", "hermex_alice_esp32c3.ino"),
        os.path.join("ESP32", "hermex_bob_esp32c3.ino"),
        os.path.join("PyQt6", "hermex_app.py"),
        "hermex_hw_experiment.py",
    ]
    missing = [f for f in needed if not os.path.exists(os.path.join(HERE, f))]
    if missing:
        report(False, "File cua repo", "thieu: " + ", ".join(missing)
               + ". Dang dung dung thu muc goc hermex chua?")
    else:
        report(True, "File cua repo", "du cac file can thiet")


def check_simulation():
    script = os.path.join(HERE, "hermex_hw_experiment.py")
    if not os.path.exists(script):
        report(False, "Chay thu mo phong", "chua co hermex_hw_experiment.py")
        return
    tmp = tempfile.mkdtemp(prefix="hermex_check_")
    try:
        proc = subprocess.run(
            [sys.executable, script, "--simulate", "--repeats", "2", "--out", tmp],
            capture_output=True, text=True, timeout=60, cwd=HERE,
        )
        files = glob.glob(os.path.join(tmp, "*", "raw.csv"))
        if proc.returncode == 0 and files:
            report(True, "Chay thu mo phong", "tao duoc raw.csv, summary.csv, meta.json")
        else:
            tail = (proc.stderr or proc.stdout).strip().splitlines()[-1:] or ["khong ro"]
            report(False, "Chay thu mo phong", tail[0])
    except Exception as exc:
        report(False, "Chay thu mo phong", str(exc))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def list_ports():
    try:
        from serial.tools import list_ports as lp
        ports = list(lp.comports())
    except Exception:
        print("[INFO] Khong liet ke duoc cong COM (pyserial chua cai dung)")
        return
    if not ports:
        print("[INFO] Chua thay cong COM nao (binh thuong neu chua cam board)")
        return
    print("[INFO] Cac cong COM hien co:")
    for p in ports:
        print(f"         {p.device}  {p.description}")


def main():
    print("Kiem tra muc 1 - chuan bi moi truong Hermex")
    print("Thu muc:", HERE)
    print("-" * 60)
    check_python()
    check_venv()
    check_git()
    check_module("OpenCV (cv2)", "cv2", "opencv-python", "__version__")
    check_module("NumPy", "numpy", "numpy", "__version__")
    check_module("pyserial", "serial", "pyserial", "VERSION", extra=serial_extra)
    check_pyqt()
    check_files()
    check_simulation()
    print("-" * 60)
    list_ports()
    print("-" * 60)
    bad = [name for ok, name in results if not ok]
    if bad:
        print(f"CHUA XONG: {len(bad)} muc loi: " + ", ".join(bad))
        sys.exit(1)
    print("XONG MUC 1. Con lai: Arduino IDE (buoc 8-14), kiem tra bang tay trong IDE.")


if __name__ == "__main__":
    main()
