# rpl26 Agent Instructions

## Reference Fidelity

`rpl26` is a clean-room HP 48 User RPL-inspired runtime. When adding or changing HP-like language behavior, check the HP 48G Series User's Guide before implementation.

The local reference extraction is `docs/hp48gug.md`. It is intentionally ignored because it contains copyrighted manual text.

Source manual: HP 48G Series User's Guide, HP Calculator Literature item 375, https://literature.hpcalc.org/items/375.

OCR/markdown extraction: olmOCR, https://github.com/allenai/olmocr.

## Planning Flow

For milestone work or any multi-step behavior change, follow this sequence:

1. Write or update a design spec under `docs/superpowers/specs/`.
2. Write an implementation plan under `docs/superpowers/plans/`.
3. Implement from the plan using test-first steps.
4. Update the plan checkboxes or status as work completes.
5. Verify before claiming completion.

Do not jump directly from a design spec to code for milestone work. If the change is small enough to skip a plan, say why in the final response.

When HP behavior is involved, the implementation plan must include a manual-audit or clean-room-notes task before implementation tasks.

## Subagent Reasoning Budgets

Implementation plans should include a suggested subagent reasoning effort for each task when subagents are appropriate.

Use lower effort for bounded mechanical work and higher effort only where judgment matters:

- `low`: metadata fill-ins, docs cleanup, simple test additions, small CLI plumbing.
- `medium`: ordinary feature implementation with clear tests.
- `high`: parser/evaluator semantics, HP manual interpretation, object-model changes, or tricky debugging.
- `xhigh`: rare; reserve for architecture decisions or failures that remain unclear after focused investigation.

Do not assign high effort by default. Keep architectural decisions in the main thread or explicitly assign them to a high-effort reviewer.

## Clean-Room Notes

Do not commit long excerpts from HP manuals.

When manual behavior matters, create or update a tracked clean-room notes file under `docs/superpowers/specs/` that includes:

- the command or behavior being checked;
- the source manual and local line range or section;
- a short behavior summary in our own words;
- implementation consequences for `rpl26`;
- any known uncertainty or intentional divergence.

Tests and implementation plans should refer to the clean-room notes, not to copied manual text.

## Scope Discipline

Keep CAS, symbolic algebra, exact algebra, units, matrices, plotting, System RPL, ROM behavior, and binary HP object formats out of the core roadmap unless the roadmap explicitly changes.

Prefer small, source-checked command families over broad command-table imports.

## Verification

Before claiming a milestone or behavior change is complete, run:

- `npm test`
- `npm run typecheck`
- `npm run build`

For user-facing behavior, also run a small CLI or REPL smoke check.
