import { test } from "node:test";
import assert from "node:assert/strict";
import { richTextHasContent, sanitizeRichText } from "./rich-text";
import { createContentSchema, updateContentSchema } from "../modules/contents/content.schema";

test("keeps creator formatting while stripping scripts and attributes", () => {
  assert.equal(sanitizeRichText('<p onclick="alert(1)"><strong>Pesan</strong> <mark>penting</mark><script>alert(1)</script><img src=x onerror=alert(1)></p>'), '<p><strong>Pesan</strong> <mark>penting</mark></p>');
});
test("empty formatted paragraphs cannot satisfy submission requirements", () => {
  for (const value of ['<p><br></p>', '<p>&nbsp;</p>', '<p><strong> </strong></p>', '<p><script>alert(1)</script></p>']) {
    assert.equal(richTextHasContent(value), false);
    assert.equal(sanitizeRichText(value), "");
  }
});
test("preserves legacy text, paragraphs and list structure", () => {
  assert.equal(sanitizeRichText('Baris pertama\nBaris kedua <contoh>'), 'Baris pertama\nBaris kedua <contoh>');
  const value = '<h2>Konsep</h2><ul><li><p><em>Cerita</em></p></li></ul>';
  assert.equal(sanitizeRichText(value), value);
  assert.equal(richTextHasContent(value), true);
});

test("create and patch payloads keep rich formatting and preserve omitted fields", () => {
  const html = '<p><strong>Pesan</strong> <mark>penting</mark></p>';
  const created = createContentSchema.parse({ type: "SCRIPT", title: "Uji rich text", body: html });
  assert.equal(created.body, html);
  assert.equal(updateContentSchema.parse({ body: html }).body, html);
  assert.equal(updateContentSchema.parse({ description: html }).description, html);
  assert.equal(updateContentSchema.parse({ title: "Judul baru" }).body, undefined);
  assert.equal(updateContentSchema.parse({ description: '<p><br></p>' }).description, null);
});
