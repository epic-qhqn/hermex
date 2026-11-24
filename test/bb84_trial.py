"""Hermex - hiệu chuẩn ngưỡng và chạy thử BB84 với sketch Alice/Bob của bạn.

Giao thức Serial (khớp sketch của bạn):
  Alice: gửi "<góc>\n"  -> trả "OK:<góc>"
  Bob:   gửi "<góc>\n"  -> quay servo, trả "LDR:<giá trị>"

Cài:  pip install pyserial
Dùng:
  python bb84_trial.py calibrate
  python bb84_trial.py run --rounds 20
Dữ liệu lưu trong thư mục logs/ (CSV).
"""
import argparse, csv, json, os, random, statistics, time
from datetime import datetime

ALICE_PORT = "COM5"
BOB_PORT = "COM6"
BAUD = 115200
CALIB_FILE = "calib.json"
LOG_DIR = "logs"
ANGLES = [0, 45, 90, 135]
RECT = (0, 90)          # cơ sở thẳng; còn lại là cơ sở chéo (45, 135)
ALICE_SETTLE = 0.8      # giây chờ servo Alice quay xong


def open_port(name):
    import serial
    ser = serial.Serial(name, BAUD, timeout=2)
    time.sleep(1.5)
    ser.reset_input_buffer()
    return ser


def read_until(ser, prefix, timeout=5):
    end = time.time() + timeout
    while time.time() < end:
        line = ser.readline().decode(errors="ignore").strip()
        if line.startswith(prefix):
            return line
    raise RuntimeError(f"Không nhận được '{prefix}' từ cổng {ser.port}")


def alice_set(alice, angle):
    alice.write(f"{angle}\n".encode())
    read_until(alice, "OK:")
    time.sleep(ALICE_SETTLE)


def bob_read(bob, angle, n=1):
    """Gửi góc cho Bob n lần, trả về danh sách giá trị LDR."""
    vals = []
    for _ in range(n):
        bob.write(f"{angle}\n".encode())
        line = read_until(bob, "LDR:")
        vals.append(int(line.split(":")[1]))
    return vals


def basis_of(angle):
    return "R" if angle in RECT else "D"


def bit_of(angle):
    return 0 if angle in (0, 45) else 1


def cmd_calibrate(args, alice=None, bob=None):
    own = alice is None
    if own:
        alice, bob = open_port(ALICE_PORT), open_port(BOB_PORT)
    alice_set(alice, 0)
    bob_read(bob, 0)  # quay Bob về 0 trước
    bright = statistics.median(bob_read(bob, 0, args.samples))
    mid = statistics.median(bob_read(bob, 45, args.samples))
    dark = statistics.median(bob_read(bob, 90, args.samples))
    contrast = abs(bright - dark)
    thr = (bright + dark) / 2
    print(f"Alice 0 / Bob 0   (sáng)   : {bright}")
    print(f"Alice 0 / Bob 45  (giữa)   : {mid}")
    print(f"Alice 0 / Bob 90  (tối)    : {dark}")
    print(f"Độ chênh sáng-tối          : {contrast}")
    print(f"Ngưỡng đề xuất             : {thr}")
    lo, hi = sorted([bright, dark])
    if not (lo <= mid <= hi):
        print("CẢNH BÁO: mức giữa nằm ngoài khoảng sáng-tối, cần xem lại căn chỉnh/nhiễu.")
    if contrast < 500:
        print("CẢNH BÁO: độ chênh dưới 500, rất dễ sai. Che sáng và căn laser lại.")
    with open(CALIB_FILE, "w") as f:
        json.dump({"bright": bright, "mid": mid, "dark": dark, "threshold": thr}, f, indent=2)
    print("Đã lưu", CALIB_FILE)


def cmd_run(args, alice=None, bob=None):
    with open(CALIB_FILE) as f:
        cal = json.load(f)
    thr, bright = cal["threshold"], cal["bright"]
    own = alice is None
    if own:
        alice, bob = open_port(ALICE_PORT), open_port(BOB_PORT)
    os.makedirs(LOG_DIR, exist_ok=True)
    path = os.path.join(LOG_DIR, f"bb84_{datetime.now():%Y%m%d_%H%M%S}.csv")
    sifted = errors = 0
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["round", "alice_angle", "alice_basis", "alice_bit", "bob_angle", "bob_basis",
                    "ldr", "passed", "bob_bit", "same_basis", "error"])
        for i in range(1, args.rounds + 1):
            a = random.choice(ANGLES)
            b = random.choice(ANGLES)
            alice_set(alice, a)
            ldr = statistics.median(bob_read(bob, b, args.samples))
            passed = (ldr - thr) * (bright - thr) > 0     # cùng phía với mức sáng
            bob_bit = bit_of(b) if passed else 1 - bit_of(b)
            same = basis_of(a) == basis_of(b)
            err = ""
            if same:
                sifted += 1
                err = int(bob_bit != bit_of(a))
                errors += err
            w.writerow([i, a, basis_of(a), bit_of(a), b, basis_of(b), ldr, int(passed), bob_bit, int(same), err])
            f.flush()
            print(f"Vòng {i:3d}: Alice {a:3d}° Bob {b:3d}° LDR {ldr:6.0f} "
                  f"{'cùng cơ sở' if same else 'khác cơ sở'}" + (f" -> {'LỖI' if err else 'đúng'}" if same else ""))
    print(f"Số vòng cùng cơ sở: {sifted}/{args.rounds}")
    if sifted:
        print(f"QBER = {errors}/{sifted} = {errors / sifted:.1%}")
    print("Đã lưu", path)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("calibrate")
    c.add_argument("--samples", type=int, default=7)
    c.set_defaults(fn=cmd_calibrate)
    r = sub.add_parser("run")
    r.add_argument("--rounds", type=int, default=20)
    r.add_argument("--samples", type=int, default=3)
    r.set_defaults(fn=cmd_run)
    args = p.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
