// Sidebar panel: Chats list. Rename, delete, pin, archive per row.
import { useState } from "react";
import {
  MessageSquare,
  MoreVertical,
  Pin,
  PinOff,
  Trash2,
  Pencil,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Thread } from "@/hooks/use-chat-store";

export function ChatList({
  threads,
  activeId,
  onPick,
  onRename,
  onDelete,
  onTogglePin,
  onToggleArchive,
  showArchived,
}: {
  threads: Thread[];
  activeId: string | null;
  onPick: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
  showArchived: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const visible = threads.filter((t) => (showArchived ? t.archived : !t.archived));
  // pinned first, then most-recent
  visible.sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.updated - a.updated;
  });

  if (visible.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic px-2 py-4">
        {showArchived ? "No archived chats." : "No chats yet. Start one!"}
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {visible.map((t) => {
        const isActive = t.id === activeId;
        const isEditing = editing === t.id;
        return (
          <div
            key={t.id}
            className={`group relative flex items-center gap-2 p-2 rounded transition-colors ${
              isActive ? "bg-muted" : "hover:bg-muted/40"
            }`}
          >
            <button
              type="button"
              onClick={() => onPick(t.id)}
              className="flex items-center gap-2 flex-1 min-w-0 text-left"
            >
              {t.pinned ? (
                <Pin className="w-3 h-3 text-amber-400 shrink-0" />
              ) : (
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              {isEditing ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => {
                    if (draft.trim()) onRename(t.id, draft.trim());
                    setEditing(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (draft.trim()) onRename(t.id, draft.trim());
                      setEditing(null);
                    }
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className="bg-background border border-border rounded px-1.5 py-0.5 text-xs flex-1 min-w-0"
                />
              ) : (
                <span className="text-xs truncate">{t.title}</span>
              )}
            </button>

            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === t.id ? null : t.id);
              }}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>

            {openMenu === t.id && (
              <div
                onMouseLeave={() => setOpenMenu(null)}
                className="absolute right-2 top-full mt-1 z-20 rounded-md border border-border bg-popover shadow-md p-1 w-40"
              >
                <button
                  className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted"
                  onClick={() => {
                    setEditing(t.id);
                    setDraft(t.title);
                    setOpenMenu(null);
                  }}
                >
                  <Pencil className="w-3 h-3" /> Rename
                </button>
                <button
                  className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted"
                  onClick={() => {
                    onTogglePin(t.id);
                    setOpenMenu(null);
                  }}
                >
                  {t.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                  {t.pinned ? "Unpin" : "Pin"}
                </button>
                <button
                  className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted"
                  onClick={() => {
                    onToggleArchive(t.id);
                    setOpenMenu(null);
                  }}
                >
                  {t.archived ? (
                    <ArchiveRestore className="w-3 h-3" />
                  ) : (
                    <Archive className="w-3 h-3" />
                  )}
                  {t.archived ? "Unarchive" : "Archive"}
                </button>
                <button
                  className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted text-red-400"
                  onClick={() => {
                    if (confirm(`Delete "${t.title}"? This cannot be undone.`)) {
                      onDelete(t.id);
                    }
                    setOpenMenu(null);
                  }}
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
