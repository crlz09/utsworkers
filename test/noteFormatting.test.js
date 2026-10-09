import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toggleNoteBullets,
  continueNoteBullet,
  noteBlocks,
} from "../src/lib/noteFormatting.js";
test("bullets toggle on selected lines without changing the following line", () => {
  const text = "First\nSecond\nThird";
  const added = toggleNoteBullets(text, 0, 13);
  assert.equal(added.text, "- First\n- Second\nThird");
  assert.equal(
    toggleNoteBullets(added.text, added.start, added.end).text,
    text,
  );
  assert.equal(toggleNoteBullets("", 0).text, "- ");
});
test("mixed lists gain missing bullets without duplicating existing ones", () => {
  assert.equal(
    toggleNoteBullets("- First\nSecond", 0, 14).text,
    "- First\n- Second",
  );
});
test("Enter continues bullets, splits text at the caret and exits empty items", () => {
  assert.equal(continueNoteBullet("- Call", 6).text, "- Call\n- ");
  assert.equal(continueNoteBullet("- Call", 4).text, "- Ca\n- ll");
  assert.equal(continueNoteBullet("- ", 2).text, "");
  assert.equal(continueNoteBullet("- Call", 2).text, "- \n- Call");
  assert.equal(continueNoteBullet("Plain text", 10), null);
  assert.equal(continueNoteBullet("- Call", 2, 6), null);
});
test("text and contiguous bullet items form separate safe display blocks", () => {
  assert.deepEqual(noteBlocks("Intro\n- One\n• Two\nClosing"), [
    { type: "paragraph", lines: ["Intro"] },
    { type: "list", lines: ["One", "Two"] },
    { type: "paragraph", lines: ["Closing"] },
  ]);
  assert.deepEqual(noteBlocks("- <script>alert(1)</script>"), [
    { type: "list", lines: ["<script>alert(1)</script>"] },
  ]);
});
