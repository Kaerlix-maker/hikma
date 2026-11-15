"use client";
import { ChatWindow, type PublicAssistant } from "@/components/ChatWindow";

/** Inside the widget iframe: the × asks the host page (widget.js) to close the panel. */
export function CloseButton({ a }: { a: PublicAssistant }) {
  return <ChatWindow a={a} theme="light" onClose={() => window.parent.postMessage({ hikma: "close" }, "*")} />;
}
