/** Asks for the front camera. */
export const openFrontCamera = () =>
  navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
    audio: false,
  });

/** Shows the stream in the <video>. A play() interrupted by a newer stream is not an error. */
export async function showStream(video: HTMLVideoElement, stream: MediaStream) {
  video.srcObject = stream;
  await video.play().catch((error: DOMException) => {
    if (error.name !== "AbortError") throw error;
  });
}

export const stopStream = (stream: MediaStream | null) =>
  stream?.getTracks().forEach((track) => track.stop());

const MAX_DATA_URL = 780_000;

/** Square JPEG of the current frame, shrunk until it fits the upload limit (usually 50–150 KB). */
export function captureSelfie(video: HTMLVideoElement): string {
  const side = Math.min(video.videoWidth, video.videoHeight);
  if (!side || video.readyState < 2) throw new Error("Camera is still getting ready. Please try again.");
  let size = Math.min(640, side);
  let quality = 0.82;
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the photo on this browser.");
    context.drawImage(
      video,
      (video.videoWidth - side) / 2,
      (video.videoHeight - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= MAX_DATA_URL) return dataUrl;
    quality -= 0.12;
    size = Math.round(size * 0.85);
  }
  throw new Error("Could not prepare the photo. Please try again.");
}
