/**
 * Generates realistic mock telemetry points for UI preview and testing
 * Each point contains: id, device_id, red_led, green_led, created_at
 */
export function generateMockReadings(count = 20, deviceId = 'esp32-wokwi-demo') {
  const readings = []
  const now = Date.now()
  const intervalMs = 5000 // 5 seconds between simulated reports

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - (count - 1 - i) * intervalMs).toISOString()
    // Realistic alternating patterns
    const redState = (Math.floor(i / 2) % 2) === 1
    const greenState = (i % 3) !== 0

    readings.push({
      id: 1000 + i,
      device_id: deviceId,
      red_led: redState,
      green_led: greenState,
      created_at: timestamp,
      _isMock: true
    })
  }

  return readings
}
