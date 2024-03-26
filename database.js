/** @typedef {[string, string, string, string[]]} Entry */

/**
 * @param {AsyncIterable<Entry>} entries
 */
export async function indexEntries(entries) {
  /** @type {Map<string, Entry[]>} */
  let defs = new Map();

  for await (const entry of entries) {
    const go = (/** @type {string} */ word) => {
      const existing = defs.get(word);
      const def = existing === undefined ? [] : existing;
      def.push(entry);
      defs.set(word, def);
    };

    const [simp, trad] = entry;

    go(simp);
    if (simp != trad) go(trad);
  }

  return defs;
}
