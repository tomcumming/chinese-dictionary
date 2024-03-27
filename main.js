import { fetchDictionaryEntries } from "./fetch-dictionary.js";
import {
  isBlank,
  openDatabase,
  indexEntries,
  writeEntries,
  lookupEntries,
} from "./database.js";

async function foo() {
  const db = await openDatabase();
  if (await isBlank(db)) {
    const entries = fetchDictionaryEntries("./cedict_1_0_ts_utf-8_mdbg.txt.gz");
    const indexed = await indexEntries(entries);
    await new Promise((res) => setTimeout(res, 1000));
    await writeEntries(db, indexed);
  } else {
    console.log("Found existing data");
    const x = await lookupEntries(db, "怎麼了");
    console.log({ x });
  }
}

foo();
