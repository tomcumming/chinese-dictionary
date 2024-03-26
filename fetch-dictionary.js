/**
 * Stream \r\n seperated lines
 * @param {ReadableStream<string>} stream
 */
async function* streamLines(stream) {
  let buffer = "";
  /** @type {any} */
  const iterableStrings = stream; // Why?
  for await (const chunk of /** @type {any} */ iterableStrings) {
    buffer += chunk;

    while (true) {
      const idx = buffer.indexOf("\r\n");
      if (idx > -1) {
        yield buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
      } else {
        break;
      }
    }
  }

  if (buffer.length > 0) yield buffer;
}

const pattern = /^(\S+)\s(\S+)\s\[([^\]]+)\]\s\/(.+)\/$/;

/**
 * @param {string} line
 * @returns {[string, string, string, string[]]}
 */
function parseEntry(line) {
  const match = pattern.exec(line);
  if (match === null) {
    throw new Error(`Could not parse line '${line}'`);
  } else {
    return [match[1], match[2], match[3], match[4].split("/")];
  }
}

/**
 * @param {URL} url
 */
export async function* fetchDictionaryEntries(url) {
  const response = await fetch(url);
  // Do i need to blobify this?
  const data = await response.blob();
  const s = data
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
    .pipeThrough(new TextDecoderStream());
  const lines = streamLines(s);
  for await (const line of lines) {
    if (line.startsWith("#")) continue;
    yield parseEntry(line);
  }
}
