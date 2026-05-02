# RPN50 Milestone 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add everyday non-CAS stack programming commands to the RPL runtime.

**Architecture:** Extend the existing pure evaluator with small builtins and one program-level conditional special form. Keep parser syntax unchanged because Milestone 2 words are already valid names. Update conformance examples, README, and REPL autocomplete through the shared builtin list.

**Tech Stack:** TypeScript, Node.js ESM, Vitest.

**Design Spec:** `docs/superpowers/specs/2026-05-02-milestone-2-design.md`

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
