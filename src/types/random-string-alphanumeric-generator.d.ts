// random-string-alphanumeric-generator.d.ts
declare module 'random-string-alphanumeric-generator' {
  /**
   * Generates a random alphanumeric string of a given length.
   * @param length The length of the random string to generate.
   * @param casing (Optional) Casing of the generated string: 'uppercase' or 'lowercase'.
   * @returns A random alphanumeric string.
   */
  export function randomAlphanumeric(length: number, casing?: 'uppercase' | 'lowercase'): string;
}
