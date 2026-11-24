/*
  Mạch tạo sương: có nước thì cấp nguồn, hết nước thì ngắt nguồn
  ---------------------------------------------------------------
  Phần cứng:
    - Arduino Uno/Nano hoặc ESP32
    - Phao báo mực nước (float switch). Dây một đầu nối chân WATER_PIN, đầu kia nối GND.
      Có nước phao nổi và đóng mạch xuống GND (đọc LOW). Nếu phao của bạn hoạt động
      ngược lại thì đổi WATER_PRESENT_LEVEL thành HIGH.
    - MOSFET module hoặc relay cấp nguồn cho module phun sương siêu âm (thường 24V)
    - LED báo trạng thái (tùy chọn)

  Lưu ý: module phun sương siêu âm không được chạy khi không có nước,
  vì đĩa gốm rung sẽ nóng và hỏng rất nhanh.

  Chế độ tùy chọn: USE_HUMIDITY_CONTROL = 1 để có thêm điều kiện độ ẩm
  (cần cảm biến DHT22 và thư viện "DHT sensor library" của Adafruit).
*/

// ===================== Cấu hình =====================
#define WATER_PIN            7      // phao nước, dùng INPUT_PULLUP
#define WATER_PRESENT_LEVEL  LOW    // mức đọc được khi CÓ nước
#define MIST_PIN             5      // điều khiển MOSFET/relay của module phun sương
#define MIST_ON_LEVEL        HIGH   // đổi thành LOW nếu relay kích mức thấp
#define LED_PIN              LED_BUILTIN

const unsigned long WATER_ON_DELAY_MS  = 2000;  // có nước ổn định 2s mới bật (tránh nhiễu do sóng nước)
const unsigned long WATER_OFF_DELAY_MS = 1000;  // mất nước quá 1s thì tắt, đủ nhanh để bảo vệ module

// ----- Điều khiển theo độ ẩm (tùy chọn) -----
#define USE_HUMIDITY_CONTROL 0      // đổi thành 1 để dùng
#if USE_HUMIDITY_CONTROL
  #include <DHT.h>
  #define DHT_PIN   4
  #define DHTTYPE   DHT22
  DHT dht(DHT_PIN, DHTTYPE);
  const float HUMIDITY_TARGET = 70.0;   // %RH
  const float HYSTERESIS      = 5.0;
  const unsigned long READ_INTERVAL_MS = 2000;
  unsigned long lastRead = 0;
  bool humidityWantsMist = true;        // mặc định cho phép khi chưa có số đọc đầu tiên
#endif

// ===================== Biến trạng thái =====================
bool waterOk = false;               // trạng thái nước đã qua lọc nhiễu
bool mistOn = false;
unsigned long waterChangedAt = 0;   // thời điểm bắt đầu thấy trạng thái mới
bool lastRawWater = false;

// ===================== Hàm phụ =====================
bool readWaterRaw() {
  return digitalRead(WATER_PIN) == WATER_PRESENT_LEVEL;
}

void setMist(bool on) {
  if (on == mistOn) return;
  mistOn = on;
  digitalWrite(MIST_PIN, on ? MIST_ON_LEVEL : !MIST_ON_LEVEL);
  digitalWrite(LED_PIN, on ? HIGH : LOW);
  Serial.println(on ? F(">> CO NUOC: cap nguon, bat phun suong")
                    : F(">> Ngat nguon phun suong"));
}

// Lọc nhiễu cho cảm biến nước: trạng thái phải ổn định đủ lâu mới được chấp nhận
void updateWater() {
  unsigned long now = millis();
  bool raw = readWaterRaw();

  if (raw != lastRawWater) {          // trạng thái đổi, bắt đầu đếm lại
    lastRawWater = raw;
    waterChangedAt = now;
  }

  unsigned long needed = raw ? WATER_ON_DELAY_MS : WATER_OFF_DELAY_MS;
  if (raw != waterOk && (now - waterChangedAt >= needed)) {
    waterOk = raw;
    Serial.println(waterOk ? F("Phat hien co nuoc") : F("Het nuoc!"));
  }
}

// ===================== setup / loop =====================
void setup() {
  Serial.begin(115200);

  pinMode(WATER_PIN, INPUT_PULLUP);
  pinMode(MIST_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(MIST_PIN, !MIST_ON_LEVEL);   // mặc định tắt khi vừa cấp điện

#if USE_HUMIDITY_CONTROL
  dht.begin();
#endif

  lastRawWater = readWaterRaw();
  waterChangedAt = millis();
  Serial.println(F("San sang. Cho phat hien nuoc..."));
}

void loop() {
  updateWater();

#if USE_HUMIDITY_CONTROL
  if (millis() - lastRead >= READ_INTERVAL_MS) {
    lastRead = millis();
    float h = dht.readHumidity();
    if (!isnan(h)) {
      if (h < HUMIDITY_TARGET - HYSTERESIS) humidityWantsMist = true;
      else if (h > HUMIDITY_TARGET + HYSTERESIS) humidityWantsMist = false;
      Serial.print(F("Do am: ")); Serial.print(h, 1); Serial.println(F(" %"));
    }
  }
  bool shouldRun = waterOk && humidityWantsMist;
#else
  bool shouldRun = waterOk;
#endif

  setMist(shouldRun);
}
