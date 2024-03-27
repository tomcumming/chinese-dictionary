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

const DB_NAME = "CC-CEDICT";
const OS_NAME = "WORDS";

export function openDatabase() {
  return new Promise((res, rej) => {
    const req = window.indexedDB.open(DB_NAME);
    req.onerror = (_ev) => rej(req.error);
    req.onsuccess = (_ev) => res(req.result);
    req.onupgradeneeded = (_event) => {
      /** @type {IDBDatabase} */
      const db = req.result;
      db.createObjectStore(OS_NAME);
      console.log("Created new object store");
    };
    req.onblocked = (_ev) => rej("Blocked?!");
  });
}

/**
 * @param {IDBDatabase} db
 * @param {'readonly' | 'readwrite'} mode
 * @param {(os: IDBObjectStore) => void} f
 */
function doTransaction(db, mode, f) {
  return new Promise((res, rej) => {
    const tx = db.transaction([OS_NAME], mode);
    tx.oncomplete = (_ev) => res(undefined);
    tx.onerror = (ev) => rej(ev);
    tx.onabort = (_ev) => rej("Transaction aborted");

    const os = tx.objectStore(OS_NAME);
    f(os);

    tx.commit();
  });
}

/**
 * @param {IDBDatabase} db
 */
export async function isBlank(db) {
  let count;
  await doTransaction(db, "readonly", (os) => {
    const req = os.count();
    req.onsuccess = () => {
      count = req.result;
    };
  });
  return count === 0;
}

/**
 * @param {IDBDatabase} db
 * @param {Map<string, Entry[]>} entries
 */
export async function writeEntries(db, entries) {
  await doTransaction(db, "readwrite", (os) => {
    os.clear();
  });
  console.log("Cleared existing");
  await doTransaction(db, "readwrite", (os) => {
    console.log("Staring writes", performance.now());
    for (const [word, es] of Array.from(entries)) {
      os.add(es, word);
    }
    console.log("Finished writes", performance.now());
  });
}

/**
 * @param {IDBDatabase} db
 * @param {string} suffix
 * @returns {Promise<undefined | [string, Entry]>}
 */
async function lookupSuffix(db, suffix) {
  let result;
  await doTransaction(db, "readonly", (os) => {
    const req = os.openCursor(IDBKeyRange.lowerBound(suffix));
    req.onerror = (_ev) => {
      throw new Error(`Failed to search for word`);
    };
    req.onsuccess = (_ev) => {
      if (req.result === null) {
        // Done
      } else {
        /** @type {Entry} */
        const entry = req.result.value;
        const key = String(req.result.key);
        if (key.startsWith(suffix)) result = [key, entry];
      }
    };
  });
  return result;
}

/**
 * @param {IDBDatabase} db
 * @param {string} search
 * @returns {Promise<Entry[]>}
 */
export async function lookupEntries(db, search) {
  let matched = 0;
  /** @type {Entry[]} */
  let entries = [];

  while (matched < search.length) {
    const suffix = search.slice(0, matched + 1);
    const res = await lookupSuffix(db, suffix);
    if (res === undefined) {
      break;
    } else {
      const [word, entry] = res;

      if (search.startsWith(word)) {
        entries.push(entry);
        matched = word.length;
      } else {
        let suffixLength = 0;
        for (let ci = 0; ci < Math.min(word.length, search.length); ci += 1)
          if (word[ci] != search[ci]) break;
        if (suffixLength > matched) matched = suffixLength;
        else break;
      }
    }
  }

  return entries;
}
