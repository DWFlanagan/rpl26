# rpl26 Milestone 5 Design

## Reference Baseline

Milestone 5 uses the HP 48G Series User's Guide as the primary behavior reference for User RPL examples and already-implemented HP-like commands.

The local ignored extraction is `docs/hp48gug.md`. Tracked files must not copy long manual excerpts. Every manual-derived example group should link to a clean-room note under `docs/superpowers/specs/` that names the command or behavior, source manual, local section or line range, behavior summary in original words, implementation consequences, and any uncertainty or intentional divergence.

## Purpose

Milestone 5 turns the existing runtime into a source-backed implementation by adding a manual-derived conformance suite and using it for the first compatibility cleanup pass across Milestones 1 through 4.

The goal is not broad HP compatibility. The goal is to make supported behavior explicit, testable, and traceable to clean-room notes, while making deferred and intentionally different behavior visible instead of accidental.

## Scope

Milestone 5 includes:

- A fixture-driven conformance layer under `tests/conformance/`.
- A reusable Vitest runner for conformance fixtures.
- Fixture schema checks for ids, compatibility status, source-note links, expected results, and non-supported reasons.
- Manual-derived examples for implemented Milestone 1 through 4 behavior: parser basics, stack commands, arithmetic, variables, locals, conditionals, loops, lists, strings, tagged objects, formatting, and word help.
- Clean-room notes for each new example family, especially examples pulled from the newly added Milestone 4 manual material.
- A compatibility status model: `supported`, `deferred`, `intentional-divergence`, and `needs-fix`.
- Narrow compatibility fixes when conformance examples reveal drift in behavior already claimed by Milestones 1 through 4.

Milestone 5 does not include:

- Adding new command families just because a manual example mentions them.
- CAS, symbolic algebra, exact arithmetic, units, matrices, plotting, directories, flags, binary HP objects, System RPL, ROM behavior, or HP object serialization.
- Full HP command table ingestion.
- Long copied manual excerpts in tracked files.
- Treating HP 49/50 or emulator behavior as a primary source.

## Fixture Model

Conformance fixtures should be data, not bespoke test code. Each fixture should include:

- `id`: stable unique identifier.
- `title`: short human-readable name.
- `input`: strict `rpl26` input to execute.
- `status`: one of `supported`, `deferred`, `intentional-divergence`, or `needs-fix`.
- `sourceNote`: path or anchor for the tracked clean-room note.
- `expectedStack`: expected stack objects for successful supported examples.
- `expectedVariables`: optional expected globals when the example stores values.
- `expectedError`: optional expected parse or runtime error for supported rejection examples.
- `reason`: required for every non-supported fixture.

Supported fixtures are hard assertions. Non-supported fixtures are still validated for metadata quality so deferred behavior stays intentional and searchable.

Expected stack values should use the existing object model shape rather than display strings. Display strings should be used only for fixtures that specifically test formatting, CLI, REPL, or help output.

## Conformance Runner

The conformance runner should:

1. Load fixture groups from `tests/conformance/`.
2. Reject duplicate fixture ids.
3. Reject unknown statuses.
4. Reject fixtures without a `sourceNote`.
5. Reject non-supported fixtures without a `reason`.
6. Execute supported fixtures through `CalculatorSession`.
7. Compare stack and variables using object-model assertions.
8. Compare expected parse or runtime errors when a supported fixture exists to document rejection behavior.
9. Report failures with fixture id, title, input, source note, expected result, and actual result.

The runner should stay small and local to tests. It should not become a production compatibility framework.

## Clean-Room Notes

Each new example group should have a corresponding tracked note under `docs/superpowers/specs/`.

Notes should include:

- The command or behavior being checked.
- The source manual and local line range or section.
- A short behavior summary in original words.
- Implementation consequences for `rpl26`.
- Known uncertainty or intentional divergence.

Tests and plans should reference these notes instead of copied manual text.

Existing clean-room notes may be expanded when they already cover the behavior. Milestone 5 should especially reuse or extend:

- `2026-05-02-hp48g-control-flow-notes.md`
- `2026-05-02-hp48g-object-library-notes.md`
- `2026-05-02-milestone-2-design.md` for known provisional assumptions that need source-backed cleanup

## Compatibility Triage

When a manual-derived example exposes behavior drift:

- Use `supported` when `rpl26` already behaves correctly or once Milestone 5 fixes the behavior.
- Use `needs-fix` when the behavior belongs to Milestones 1 through 4, the manual behavior is clear, and the fix does not expand roadmap scope.
- Use `deferred` when the example depends on object families, calculator modes, UI state, or command families outside the current roadmap.
- Use `intentional-divergence` when `rpl26` deliberately differs from HP behavior for clean-room, implementation, or scope reasons.

`needs-fix` fixtures should not be allowed to accumulate silently. The Milestone 5 implementation plan should convert each selected `needs-fix` case into a failing test, make the smallest compatible runtime change, then promote the fixture to `supported`.

## Behavior Fix Boundary

Milestone 5 may fix:

- Parser or evaluator drift for already-supported object types.
- Stack effects for implemented commands.
- Type, range, underflow, and error behavior for implemented commands.
- Formatting differences for implemented object types where the project already claims display support.
- Help metadata mismatches for implemented words.

Milestone 5 should defer:

- Behavior requiring new object types beyond the current model.
- Commands not already in the Milestone 1 through 4 supported set.
- HP display modes, flags, directories, menus, or binary object representation.
- Numeric precision work that requires a new backend.

## Testing

Tests should cover:

- Fixture schema validation.
- Duplicate fixture id detection.
- Supported success fixtures.
- Supported expected-error fixtures.
- Required reasons for deferred, divergent, and needs-fix fixtures.
- Source-note links for every fixture.
- Manual-derived examples across Milestone 1 through 4 command families.
- A small CLI or REPL smoke check for user-facing examples after compatibility fixes land.

The final verification gate remains:

```bash
npm test
npm run typecheck
npm run build
```

For user-facing behavior, also run at least one strict CLI smoke check, such as:

```bash
npm run calc -- "\"abc\" HEAD \"abc\" TRIL"
```

## Success Criteria

Milestone 5 is complete when:

- The conformance fixture runner is in place.
- Manual-derived supported examples execute as tests.
- Deferred, divergent, and needs-fix examples require explicit reasons.
- Each fixture references tracked clean-room notes.
- Selected Milestone 1 through 4 compatibility drift has been fixed or explicitly triaged.
- `npm test`, `npm run typecheck`, `npm run build`, and a small CLI smoke check pass.

The milestone should leave the project with a stronger regression net and a clearer compatibility map, without widening the runtime beyond the existing roadmap.
