import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("writes a header row and data rows with CRLF line endings", () => {
    expect(toCsv(["a", "b"], [["1", 2]])).toBe("a,b\r\n1,2\r\n");
  });

  it("quotes values with commas, quotes or line breaks", () => {
    expect(toCsv(["x"], [["Oak, Iroko"], ['Say "hi"'], ["two\nlines"]])).toBe(
      'x\r\n"Oak, Iroko"\r\n"Say ""hi"""\r\n"two\nlines"\r\n',
    );
  });

  it.each(["=1+1", "+234", "-2+3", "@SUM(A1)", '=HYPERLINK("http://x")'])(
    "neutralises a formula-like value: %s",
    (value) => {
      const cell = toCsv(["x"], [[value]]).split("\r\n")[1];
      expect(cell.replace(/^"/, "").startsWith("'")).toBe(true);
    },
  );

  it("leaves numbers numeric, including negatives", () => {
    expect(toCsv(["n"], [[-50]])).toBe("n\r\n-50\r\n");
  });

  it("leaves numeric strings like exact money amounts unprefixed", () => {
    expect(toCsv(["n"], [["-50.05"], ["1234.56"]])).toBe(
      "n\r\n-50.05\r\n1234.56\r\n",
    );
  });
});
