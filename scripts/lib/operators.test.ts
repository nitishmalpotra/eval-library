import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOperators } from "./operators";

test("middle names, honorifics, initials, and list order collapse to one spelling", () => {
  const { normalized, merges } = normalizeOperators([
    "Aishwarya Naresh Reganti, Kiriti Badam",
    "Kiriti Badam and Aishwarya Reganti",
    "Aishwarya Reganti & Kiriti Badam",
    "Nick, Akshay Sharma",
    "Nick Turley",
    "Dr. Marily Nika",
    "Ryan J. Salva, Hilary Gridley",
    "Hilary Gridley, Ryan J. Salva",
    "Hamel Husain, Shreya Shankar",
    "HL Hussein",
    "",
  ]);

  assert.equal(
    normalized.get("Aishwarya Naresh Reganti, Kiriti Badam"),
    "Aishwarya Reganti, Kiriti Badam",
  );
  assert.equal(normalized.get("Kiriti Badam and Aishwarya Reganti"), "Aishwarya Reganti, Kiriti Badam");
  assert.equal(normalized.get("Aishwarya Reganti & Kiriti Badam"), "Aishwarya Reganti, Kiriti Badam");
  assert.equal(normalized.get("Nick, Akshay Sharma"), "Akshay Sharma, Nick Ung");
  assert.equal(normalized.get("Nick Turley"), "Nick Turley");
  assert.equal(normalized.get("Dr. Marily Nika"), "Marily Nika");
  assert.equal(normalized.get("Ryan J. Salva, Hilary Gridley"), "Hilary Gridley, Ryan Salva");
  assert.equal(normalized.get("Hilary Gridley, Ryan J. Salva"), "Hilary Gridley, Ryan Salva");
  assert.equal(normalized.get("Hamel Husain, Shreya Shankar"), "Hamel Husain, Shreya Shankar");
  assert.equal(normalized.get("HL Hussein"), "Hamel Husain");
  assert.equal(normalized.get(""), "");
  assert.deepEqual(merges, [
    { from: "Aishwarya Naresh Reganti", to: "Aishwarya Reganti" },
    { from: "Dr. Marily Nika", to: "Marily Nika" },
    { from: "HL Hussein", to: "Hamel Husain" },
    { from: "Nick", to: "Nick Ung" },
    { from: "Ryan J. Salva", to: "Ryan Salva" },
  ]);
});

test("different middle names that share a first and last name stay separate", () => {
  const { normalized, merges } = normalizeOperators(["Mary Ann Smith", "Mary Jane Smith"]);

  assert.equal(normalized.get("Mary Ann Smith"), "Mary Ann Smith");
  assert.equal(normalized.get("Mary Jane Smith"), "Mary Jane Smith");
  assert.deepEqual(merges, []);
});

test("the Anthropic CPO panel's Amy and Mike expand to full names", () => {
  const { normalized, merges } = normalizeOperators([
    "Mike, Amy",
    "Mike Taylor",
    "Lenny Rachitsky, Mike Taylor",
    "Mike Krieger",
  ]);

  assert.equal(normalized.get("Mike, Amy"), "Ami Vora, Mike Krieger");
  assert.equal(normalized.get("Mike Taylor"), "Mike Taylor");
  assert.equal(normalized.get("Lenny Rachitsky, Mike Taylor"), "Lenny Rachitsky, Mike Taylor");
  assert.equal(normalized.get("Mike Krieger"), "Mike Krieger");
  assert.deepEqual(merges, [
    { from: "Amy", to: "Ami Vora" },
    { from: "Mike", to: "Mike Krieger" },
  ]);
});

test("a shorter form absorbs the same name with a middle name", () => {
  const { normalized, merges } = normalizeOperators(["Mary Ann Smith", "Mary Smith"]);

  assert.equal(normalized.get("Mary Ann Smith"), "Mary Smith");
  assert.equal(normalized.get("Mary Smith"), "Mary Smith");
  assert.deepEqual(merges, [{ from: "Mary Ann Smith", to: "Mary Smith" }]);
});
