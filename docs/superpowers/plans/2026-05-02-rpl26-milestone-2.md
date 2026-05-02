# rpl26 Milestone 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add everyday non-CAS stack programming commands to the RPL runtime, then audit them against HP 48 User RPL before treating behavior as stable.

**Architecture:** Extend the existing pure evaluator with small builtins and one program-level conditional special form. Keep parser syntax unchanged because Milestone 2 words are already valid names. Update conformance examples, README, and REPL autocomplete through the shared builtin list.

**Tech Stack:** TypeScript, Node.js ESM, Vitest.

**Design Spec:** `docs/superpowers/specs/2026-05-02-milestone-2-design.md`

**Reference Baseline:** HP 48G Series User RPL behavior. HP 49/50 manuals are secondary references only.

---

## Tasks

### Task 1: Stack Utilities

Add tests and evaluator support for `DUP2`, `DROP2`, `ROT`, and `PICK`.

### Task 2: List Utilities

Add tests and evaluator support for `->LIST`, `LIST->`, `SIZE`, and `GET`.

### Task 3: Booleans And Comparisons

Add tests and evaluator support for `TRUE`, `FALSE`, `==`, `<>`, `<`, `>`, `<=`, and `>=`.

### Task 4: Conditionals

Add tests and evaluator support for program-level `IF THEN ELSE END`, with optional `ELSE`.

### Task 5: Docs And Conformance

Add Milestone 2 conformance examples, README examples, and verify CLI/REPL autocomplete picks up new builtins.

### Task 6: Final Verification

Run `npm test`, `npm run typecheck`, `npm run build`, and CLI smoke commands for stack, list, comparison, and conditional examples.

### Task 7: HP 48 Manual Audit

Using the structured HP 48 manual extraction artifact, classify each Milestone 2 command as `core`, `cas`, `deferred-non-cas`, `system`, `ui`, or `unknown`; compare implemented behavior to documented behavior; then either correct implementation, document intentional divergence, or mark the command provisional.
