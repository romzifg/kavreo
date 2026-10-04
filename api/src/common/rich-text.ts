import sanitizeHtml from "sanitize-html";

export function isRichText(value: string) {
	return /^\s*<(?:p|h2|h3|ul|ol|blockquote)\b/i.test(value);
}

export function richTextHasContent(value?: string | null) {
	if (!value) return false;
	if (!isRichText(value)) return Boolean(value.trim());
	return Boolean(
		sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
			.replace(/&(?:nbsp|#160|#x0*a0);/gi, " ")
			.trim(),
	);
}

export function sanitizeRichText(value: string) {
	if (!isRichText(value)) return value.trim();
	const clean = sanitizeHtml(value, {
		allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "ul", "ol", "li", "blockquote", "mark"],
		allowedAttributes: {},
	});
	return richTextHasContent(clean) ? clean : "";
}
