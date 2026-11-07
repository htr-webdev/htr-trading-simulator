import yauzl from "yauzl";

export function extractCsvFromArchive(archive: Uint8Array): Promise<string> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(
      Buffer.from(archive),
      { lazyEntries: true },
      (error, zipFile) => {
        if (error || !zipFile) {
          reject(error ?? new Error("Unable to open ZIP archive."));
          return;
        }

        let settled = false;

        const fail = (cause: Error) => {
          if (settled) return;
          settled = true;
          zipFile.close();
          reject(cause);
        };

        zipFile.on("error", fail);

        zipFile.on("entry", (entry) => {
          if (!entry.fileName.toLowerCase().endsWith(".csv")) {
            zipFile.readEntry();
            return;
          }

          zipFile.openReadStream(entry, (streamError, stream) => {
            if (streamError || !stream) {
              fail(streamError ?? new Error("Unable to read CSV entry."));
              return;
            }

            const chunks: Buffer[] = [];

            stream.on("data", (chunk: Buffer) => {
              chunks.push(chunk);
            });

            stream.on("error", fail);

            stream.on("end", () => {
              if (settled) return;
              settled = true;
              zipFile.close();
              resolve(Buffer.concat(chunks).toString("utf8"));
            });
          });
        });

        zipFile.on("end", () => {
          if (!settled) {
            fail(new Error("No CSV file found in ZIP archive."));
          }
        });

        zipFile.readEntry();
      },
    );
  });
}
