import { richTextHtml } from "@/lib/rich-text";

export function RichText({ value }: { value: string }) {
	return <div className="rich-text-content whitespace-normal" dangerouslySetInnerHTML={{ __html: richTextHtml(value) }} />;
}
