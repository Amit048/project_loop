import { Readable } from "stream";
import csvParser from "csv-parser";
import { CHANNELS } from "../validators/feedbackValidators.js";

// Parses a CSV buffer into { validRows, failedRows }.
// Expected columns: content, channel, customer_label, created_at
export const parseFeedbackCsv = (buffer) =>
  new Promise((resolve, reject) => {
    const validRows = [];
    const failedRows = [];
    let rowNumber = 0;

    Readable.from(buffer)
      .pipe(csvParser())
      .on("data", (row) => {
        rowNumber += 1;
        const content = (row.content || "").trim();
        const channel = (row.channel || "manual").trim().toLowerCase();

        if (!content) {
          failedRows.push({ row: rowNumber, reason: "Missing 'content'", data: row });
          return;
        }
        if (!CHANNELS.includes(channel)) {
          failedRows.push({
            row: rowNumber,
            reason: `Invalid channel '${channel}'`,
            data: row,
          });
          return;
        }

        validRows.push({
          content,
          channel,
          customerLabel: (row.customer_label || "").trim(),
          sourceRef: (row.source_ref || "").trim(),
        });
      })
      .on("end", () => resolve({ validRows, failedRows, totalRows: rowNumber }))
      .on("error", reject);
  });

export default { parseFeedbackCsv };
