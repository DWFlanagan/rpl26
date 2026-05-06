import type { RplObject, SessionSnapshot, SnapshotValidationError } from "../types.js";

export type ProgramExample = {
  description?: string;
  input: string;
  expectedStack: RplObject[];
};

export type AnnotatedSourceRecord = {
  name: string;
  source: string;
  installedHash: string;
  updatedAt: string;
  examples: ProgramExample[];
  notes?: string;
};

export type ProjectSnapshot = {
  format: "rpl26-project";
  version: 1;
  snapshot: SessionSnapshot;
  sources: Record<string, AnnotatedSourceRecord>;
};

export type ProjectLoadResult = { ok: true; project: ProjectSnapshot } | { ok: false; error: SnapshotValidationError };

export type IntegrationErrorCode =
  | "UnknownSession"
  | "DuplicateSession"
  | "InvalidName"
  | "InvalidAnnotatedSource"
  | "InvalidProject"
  | "NonProgramVariable"
  | "SourceUnavailable"
  | "ExampleFailed"
  | "ExampleMismatch"
  | "InvalidRequest";

export type IntegrationError = {
  code: IntegrationErrorCode;
  message: string;
  path?: string;
};

export type IntegrationResult<T> = { ok: true; value: T } | { ok: false; error: IntegrationError };
