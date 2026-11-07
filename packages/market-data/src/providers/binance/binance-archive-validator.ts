export function validateZipArchive(data: Uint8Array): void {
  if (data.length < 4) {
    throw new Error("Downloaded archive is empty or incomplete.");
  }

  const hasZipSignature =
    data[0] === 0x50 &&
    data[1] === 0x4b &&
    (data[2] === 0x03 || data[2] === 0x05 || data[2] === 0x07) &&
    (data[3] === 0x04 || data[3] === 0x06 || data[3] === 0x08);

  if (!hasZipSignature) {
    throw new Error("Downloaded file is not a valid ZIP archive.");
  }
}
