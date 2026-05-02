import type { RplObject } from "./types.js";

export function formatObject(object: RplObject): string {
  switch (object.kind) {
    case "real":
      return String(object.value);
    case "name":
      return object.name;
    case "quotedName":
      return `'${object.name}'`;
    case "program":
      return `<< ${object.body.map(formatObject).join(" ")} >>`;
    case "list":
      return `{ ${object.items.map(formatObject).join(" ")} }`;
    case "tagged":
      return `${object.tag}: ${formatObject(object.value)}`;
    case "string":
      return JSON.stringify(object.value);
  }
}
