// Helper JSON replacer that safely serializes bigint values by converting them to strings.
export function jsonBigIntReplacer(_key: string, value: unknown) {
  return typeof value === 'bigint' ? value.toString() : value;
}

