import { test } from "node:test";
import assert from "node:assert/strict";
import { watchBestFix, distanceMetres } from "../src/app/employee/utils/location";
import { captureSelfie } from "../src/app/employee/utils/capture";

test("GPS recovery clears earlier errors, prefers accuracy and stops watching", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let onPosition!: PositionCallback;
  let onFailure!: PositionErrorCallback;
  let cleared = 0;
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { geolocation: {
    watchPosition(success: PositionCallback, failure: PositionErrorCallback) { onPosition = success; onFailure = failure; return 42; },
    clearWatch(id: number) { cleared = id; },
  } } });
  try {
    const errors: string[] = [];
    const accuracies: number[] = [];
    const stop = watchBestFix((fix) => accuracies.push(fix.accuracy), (message) => errors.push(message));
    onFailure({ code: 2 } as GeolocationPositionError);
    for (const accuracy of [100, 20, 80]) onPosition({ timestamp: Date.now(), coords: { latitude: 12, longitude: 77, accuracy } } as GeolocationPosition);
    assert.deepEqual(accuracies, [100, 20]);
    assert.equal(errors.at(-1), "");
    stop();
    assert.equal(cleared, 42);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "navigator", descriptor);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});

test("distance hints match known points and camera rejects an unready frame", () => {
  assert.equal(distanceMetres(12, 77, 12, 77), 0);
  assert.equal(distanceMetres(0, 0, 0, 1), 111195);
  assert.throws(() => captureSelfie({ videoWidth: 0, videoHeight: 0, readyState: 0 } as HTMLVideoElement), /getting ready/);
});
