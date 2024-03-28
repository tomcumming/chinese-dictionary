import { fetchDictionaryEntries } from "./fetch-dictionary.js";
import {
  isBlank,
  openDatabase,
  indexEntries,
  writeEntries,
  lookupEntries,
} from "./database.js";

/** @typedef {import('./database.js').Entry} Entry */

const db = await openDatabase();
if (await isBlank(db)) {
  const url = prompt("URL to CC-CEdict .gz file");
  if (url === null) throw new Error(`Did not receive URL`);
  const entries = fetchDictionaryEntries(url);
  const indexed = await indexEntries(entries);
  await new Promise((res) => setTimeout(res, 1000));
  await writeEntries(db, indexed);
}

/** @typedef {[Entry, Entry[]]} Definition */

/** @param {string} search
 * @returns {Promise<Entry[][]>}
 */
async function allEntries(search) {
  if (search.length > 0) {
    return [await lookupEntries(db, search)].concat(
      await allEntries(search.slice(1)),
    );
  } else {
    return [];
  }
}

/** @param {Definition[]} defs
 * @returns {Definition[]}
 */
function mergeChildren(defs) {
  return defs; // TODO
}

/**
 * @param {Entry} longest
 * @param {Entry[]} rest
 * @returns {Definition}
 */
function addChildren(longest, rest) {
  /** @type {Entry[]} */
  let children = [];
  /** @type {Set<string>} */
  let simps = new Set();
  /** @type {Set<string>} */
  let trads = new Set();
  for (const entry of rest) {
    if (trads.has(entry[0]) && simps.has(entry[1])) continue;
    trads.add(entry[0]);
    simps.add(entry[1]);
    children.push(entry);
  }

  return [longest, children];
}

/**
 * @param {string} search
 * @returns {Promise<Definition[]>}
 */
async function lookupWords(search) {
  const ess = await allEntries(search);

  /** @type {Definition[]} */
  let defs = [];
  /** @type {Set<string>} */
  let simps = new Set();
  /** @type {Set<string>} */
  let trads = new Set();

  for (const es of ess) {
    if (es.length == 0) continue;

    const longest = es[es.length - 1];
    const rest = es.slice(0, es.length - 1);

    if (trads.has(longest[0]) && simps.has(longest[1])) continue;
    trads.add(longest[0]);
    simps.add(longest[1]);

    defs.push(addChildren(longest, rest));
  }

  return mergeChildren(defs);
}

/** @type {(e: Entry) => string} */
function entryHtml([trad, simp, pinyin, ts]) {
  return `<div class="entry">
    <div>${trad}</div>
    <div>${simp}</div>
    <div>${pinyin}</div>
    <div>${ts.join(", ")}</div>
  </div>`;
}

/**
 * @param {HTMLDivElement} wrapper
 * @param {Definition} def
 */
function appendDefinition(wrapper, [root, children]) {
  const defElem = document.createElement("div");
  const csElem =
    children.length > 0
      ? `<div class="children">${children.map((e) => entryHtml(e)).join("")}</div>`
      : "";
  defElem.innerHTML = `${entryHtml(root)}${csElem}`;
  wrapper.appendChild(defElem);
}

/**
 * @param {string} search
 */
async function doSearch(search) {
  const defs = await lookupWords(search);

  const wrapper = document.querySelector("#definitions");
  if (!(wrapper instanceof HTMLDivElement))
    throw new Error(`Can't find definitions wrapper`);

  while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

  for (const def of defs) appendDefinition(wrapper, def);
}

{
  const form = document.querySelector("form");
  const input = document.querySelector("input");
  if (input instanceof HTMLInputElement && form instanceof HTMLFormElement) {
    input.oninput = (ev) => {
      // @ts-ignore
      const isComposing = ev.isComposing;
      if (!isComposing) doSearch(input.value);
    };
    doSearch(input.value);
  } else {
    throw new Error(`Can't find form and input elements in page`);
  }
}
