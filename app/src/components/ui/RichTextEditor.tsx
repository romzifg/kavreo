import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { Bold, Italic, Underline, Highlighter, Heading2, List, ListOrdered, Quote, Undo2, Redo2, RemoveFormatting } from "lucide-react";
import { useEffect, useRef } from "react";
import { richTextHtml } from "@/lib/rich-text";
import { cn } from "@/lib/format";

export function RichTextEditor({
	value,
	onChange,
	onBlur,
	inputRef,
	label,
	placeholder,
	error,
}: {
	value: string;
	onChange: (value: string) => void;
	onBlur: () => void;
	inputRef: (element: HTMLElement | null) => void;
	label: string;
	placeholder: string;
	error?: boolean;
}) {
	const lastValue = useRef(value);
	const rootRef = useRef<HTMLDivElement>(null);
	const editor = useEditor({
		extensions: [
			StarterKit.configure({ heading: { levels: [2] }, link: false, code: false, codeBlock: false, horizontalRule: false }),
			Highlight,
		],
		content: richTextHtml(value),
		editorProps: {
			attributes: {
				class: "rich-text-content rich-text-input",
				role: "textbox",
				"aria-label": label,
				"aria-multiline": "true",
				"aria-invalid": String(Boolean(error)),
				"data-placeholder": placeholder,
			},
		},
		onCreate: ({ editor }) => inputRef(editor.view.dom),
		onUpdate: ({ editor }) => {
			const next = editor.isEmpty ? "" : editor.getHTML();
			lastValue.current = next;
			onChange(next);
		},
		onBlur: () => onBlur(),
	});
	const state = useEditorState({
		editor,
		selector: ({ editor }) =>
			editor
				? {
						bold: editor.isActive("bold"),
						italic: editor.isActive("italic"),
						underline: editor.isActive("underline"),
						highlight: editor.isActive("highlight"),
						heading: editor.isActive("heading", { level: 2 }),
						bullets: editor.isActive("bulletList"),
						ordered: editor.isActive("orderedList"),
						quote: editor.isActive("blockquote"),
						undo: editor.can().undo(),
						redo: editor.can().redo(),
					}
				: null,
	});

	useEffect(() => {
		if (editor && value !== lastValue.current) {
			lastValue.current = value;
			editor.commands.setContent(richTextHtml(value), { emitUpdate: false });
		}
	}, [editor, value]);
	useEffect(() => {
		if (!editor) return;
		const element = rootRef.current?.querySelector<HTMLElement>('[contenteditable="true"]');
		if (element) {
			inputRef(element);
			element.setAttribute("aria-invalid", String(Boolean(error)));
		}
		return () => inputRef(null);
	}, [editor, inputRef, error]);

	const buttons = [
		{ title: "Bold (Ctrl+B)", icon: Bold, active: state?.bold, action: () => editor?.chain().focus().toggleBold().run() },
		{ title: "Italic (Ctrl+I)", icon: Italic, active: state?.italic, action: () => editor?.chain().focus().toggleItalic().run() },
		{ title: "Underline (Ctrl+U)", icon: Underline, active: state?.underline, action: () => editor?.chain().focus().toggleUnderline().run() },
		{ title: "Highlight", icon: Highlighter, active: state?.highlight, action: () => editor?.chain().focus().toggleHighlight().run() },
		{ title: "Heading", icon: Heading2, active: state?.heading, action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
		{ title: "Daftar poin", icon: List, active: state?.bullets, action: () => editor?.chain().focus().toggleBulletList().run() },
		{ title: "Daftar bernomor", icon: ListOrdered, active: state?.ordered, action: () => editor?.chain().focus().toggleOrderedList().run() },
		{ title: "Kutipan", icon: Quote, active: state?.quote, action: () => editor?.chain().focus().toggleBlockquote().run() },
	];
	return (
		<div
			ref={rootRef}
			className={cn("rich-text-editor overflow-hidden rounded-2xl border bg-base-100", error ? "border-error" : "border-base-300")}
		>
			<div
				role="toolbar"
				aria-label={`Format ${label}`}
				onMouseDown={(event) => event.preventDefault()}
				className="flex flex-wrap items-center gap-1 border-b border-base-300 bg-primary/5 p-2"
			>
				{buttons.map(({ title, icon: Icon, active, action }) => (
					<button
						key={title}
						type="button"
						title={title}
						aria-label={title}
						aria-pressed={!!active}
						disabled={!editor}
						className={cn("btn btn-sm btn-square border-0", active ? "bg-primary/15 text-primary" : "btn-ghost")}
						onClick={action}
					>
						<Icon className="size-4" />
					</button>
				))}
				<span className="mx-1 h-5 w-px bg-base-300" aria-hidden />
				<button
					type="button"
					title="Hapus format"
					aria-label="Hapus format"
					className="btn btn-ghost btn-sm btn-square"
					onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
				>
					<RemoveFormatting className="size-4" />
				</button>
				<button
					type="button"
					title="Undo"
					aria-label="Undo"
					disabled={!state?.undo}
					className="btn btn-ghost btn-sm btn-square"
					onClick={() => editor?.chain().focus().undo().run()}
				>
					<Undo2 className="size-4" />
				</button>
				<button
					type="button"
					title="Redo"
					aria-label="Redo"
					disabled={!state?.redo}
					className="btn btn-ghost btn-sm btn-square"
					onClick={() => editor?.chain().focus().redo().run()}
				>
					<Redo2 className="size-4" />
				</button>
			</div>
			<EditorContent editor={editor} />
			<p className="border-t border-base-300 px-4 py-2 text-[11px] text-base-content/50">
				Blok kata atau kalimat, lalu pilih format untuk menonjolkan pesanmu.
			</p>
		</div>
	);
}
