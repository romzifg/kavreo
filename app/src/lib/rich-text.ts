import DOMPurify from "dompurify";

const tags = ["p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "ul", "ol", "li", "blockquote", "mark"];

export function isRichText(value: string) {
	return /^\s*<(?:p|h2|h3|ul|ol|blockquote)\b/i.test(value);
}

export function richTextHtml(value: string) {
	if (isRichText(value)) {
		return DOMPurify.sanitize(value, { ALLOWED_TAGS: tags, ALLOWED_ATTR: [] });
	}
	// Escape legacy plain text so angle brackets and line breaks remain literal.
	return value
		.split(/\r?\n/)
		.map((line) => `<p>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") || "<br>"}</p>`)
		.join("");
}

export function richTextToText(value: string) {
	if (!isRichText(value)) return value;
	const doc = new DOMParser().parseFromString(richTextHtml(value), "text/html");
	doc.querySelectorAll("br").forEach((el) => el.replaceWith("\n"));
	doc.querySelectorAll("p,h2,h3,li,blockquote").forEach((el) => el.append("\n"));
	return (doc.body.textContent ?? "")
		.replace(/\u00a0/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}
