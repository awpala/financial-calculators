/**
 * Split a parse error into the plain prose and the pieces of input it quotes.
 *
 * The parser quotes every character, name, and figure it names — `'('`,
 * `'pre_tax'` — so the message reads correctly wherever it is shown, including
 * where it cannot be marked up at all. A reader is served better by seeing those
 * pieces set as code, and that is a presentation choice, so the split happens
 * here rather than the messages carrying markup of their own.
 *
 * A quoted piece runs from one `'` to the next. A name may itself contain an
 * apostrophe, which splits one quotation into two; the words are unchanged and
 * only the emphasis lands oddly, which is why the parser's own message stays the
 * plain sentence.
 */

/** One run of a message: prose, or a piece of the member's input. */
export type MessagePart = {
  /** The run's text, without the quotation marks that delimited it. */
  text: string;
  /** Whether the run is quoted input rather than prose. */
  quoted: boolean;
};

/** Split a message into its prose and quoted runs, in order. */
export function splitQuotedMessage(message: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let index = 0;

  while (index < message.length) {
    const open = message.indexOf("'", index);
    const close = open === -1 ? -1 : message.indexOf("'", open + 1);
    if (open === -1 || close === -1) break;
    if (open > index) {
      parts.push({ text: message.slice(index, open), quoted: false });
    }
    parts.push({ text: message.slice(open + 1, close), quoted: true });
    index = close + 1;
  }

  if (index < message.length) {
    parts.push({ text: message.slice(index), quoted: false });
  }
  return parts;
}
