import time
import serial
from config import SERIAL_CONFIG
from ldr_calibration import run_calibration

class BobSerial:
    """Gửi lệnh góc 0 trước mỗi lần đọc, vì firmware Bob chỉ trả LDR sau khi nhận lệnh."""
    def __init__(self, ser):
        self.ser = ser
    def readline(self):
        self.ser.write(b"0\n")
        return self.ser.readline()

ser = serial.Serial(
    SERIAL_CONFIG["COM_PORT"],
    SERIAL_CONFIG["BAUD_RATE"],
    timeout=SERIAL_CONFIG["SERIAL_TIMEOUT"],
)
time.sleep(2)            # board có thể tự reset khi mở cổng
ser.reset_input_buffer()

threshold, result = run_calibration(BobSerial(ser))
print("Ngưỡng:", threshold)
print("Trung bình nền:", round(result["mean"], 1), "| Độ lệch chuẩn:", round(result["stdev"], 1))
ser.close()
