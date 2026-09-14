export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

/** One message written as plain paragraphs with a single action link in the middle. */
export interface MailParts {
  subject: string;
  /** Paragraphs shown before the link. */
  intro: readonly string[];
  link: string;
  /** Paragraphs shown after the link. */
  outro: readonly string[];
}

const paragraph = (text: string): string => `<p>${text}</p>`;

/**
 * Builds the plain-text and HTML parts from the same paragraphs, so the two can never drift apart. The link is a bare
 * URL in the text part and an anchor in the HTML part.
 */
export function renderMail({ subject, intro, link, outro }: MailParts): MailContent {
  const text = [...intro, link, ...outro].join('\n\n');
  const html = [...intro.map(paragraph), `<p><a href="${link}">${link}</a></p>`, ...outro.map(paragraph)].join('');
  return { subject, text, html };
}
