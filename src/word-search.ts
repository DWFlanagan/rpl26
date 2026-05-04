import { WORDS, listWords, type WordMetadata } from "./words.js";

function haystack(word: WordMetadata): string {
  return [
    word.name,
    word.category,
    word.stack,
    word.description,
    word.source,
    ...(word.keywords ?? []),
    ...(word.aliases ?? [])
  ]
    .join(" ")
    .toLowerCase();
}

export function searchWords(query: string): WordMetadata[] {
  const normalized = query.trim().toLowerCase();
  const words = listWords().map((name) => WORDS[name]);
  if (normalized.length === 0) return words;
  return words.filter((word) => haystack(word).includes(normalized));
}

export function describeWordDetail(name: string): string | undefined {
  const word = WORDS[name];
  if (word === undefined) return undefined;
  const lines = [word.name, `Category: ${word.category}`, `Stack: ${word.stack}`, `Source: ${word.source}`, word.description];
  if (word.aliases !== undefined && word.aliases.length > 0) lines.push(`Aliases: ${word.aliases.join(", ")}`);
  if (word.keywords !== undefined && word.keywords.length > 0) lines.push(`Keywords: ${word.keywords.join(", ")}`);
  if (word.examples !== undefined && word.examples.length > 0) lines.push("Examples:", ...word.examples.map((example) => `  ${example}`));
  return lines.join("\n");
}
