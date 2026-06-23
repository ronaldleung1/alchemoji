"use client";

import {
  type EmojiPickerListCategoryHeaderProps,
  type EmojiPickerListEmojiProps,
  type EmojiPickerListRowProps,
  EmojiPicker as EmojiPickerPrimitive,
} from "frimousse";
import { LoaderIcon, SearchIcon, XIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmojiPointerDownHandler = (emoji: string, e: React.PointerEvent) => void;

const EmojiPickerDragContext =
  React.createContext<EmojiPointerDownHandler | null>(null);

function EmojiPickerDragProvider({
  onDragStart,
  children,
}: {
  onDragStart: EmojiPointerDownHandler;
  children: React.ReactNode;
}) {
  return (
    <EmojiPickerDragContext.Provider value={onDragStart}>
      {children}
    </EmojiPickerDragContext.Provider>
  );
}

function EmojiPicker({
  className,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Root>) {
  return (
    <EmojiPickerPrimitive.Root
      className={cn(
        "bg-popover text-popover-foreground isolate flex h-full w-full flex-col overflow-hidden",
        className
      )}
      data-slot="emoji-picker"
      {...props}
    />
  );
}

function EmojiPickerSearch({
  className,
  value: valueProp,
  onChange: onChangeProp,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Search>) {
  const [value, setValue] = React.useState(
    valueProp !== undefined ? String(valueProp) : ""
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onChangeProp?.(e);
  };

  return (
    <div
      className={cn("flex h-10 items-center gap-2 border-b px-3", className)}
      data-slot="emoji-picker-search-wrapper"
    >
      <SearchIcon className="size-4 shrink-0 opacity-50" />
      <EmojiPickerPrimitive.Search
        className="outline-hidden placeholder:text-muted-foreground flex h-10 w-full bg-transparent py-3 text-base disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
        data-slot="emoji-picker-search"
        value={value}
        onChange={handleChange}
        {...props}
      />
      {value.length > 0 && (
        <button
          type="button"
          aria-label="Clear search"
          className="shrink-0 text-muted-foreground hover:text-foreground active:scale-90 transition-transform"
          onPointerDown={(e) => {
            e.preventDefault();
            setValue("");
          }}
        >
          <XIcon className="size-4" />
        </button>
      )}
      <div className="ml-1 h-5 w-px shrink-0 bg-border" />
      <EmojiPickerSkinTone />
    </div>
  );
}

function EmojiPickerRow({ children, ...props }: EmojiPickerListRowProps) {
  return (
    <div {...props} className="scroll-my-1 px-1" data-slot="emoji-picker-row">
      {children}
    </div>
  );
}

function EmojiPickerEmoji({
  emoji,
  className,
  ...props
}: EmojiPickerListEmojiProps) {
  const onDragStart = React.useContext(EmojiPickerDragContext);
  return (
    <button
      {...props}
      onPointerDown={(e) => {
        onDragStart?.(emoji.emoji, e);
      }}
      className={cn(
        "data-[active]:bg-accent flex size-11 items-center justify-center rounded-lg text-[1.75rem] transition hover:bg-muted active:scale-[0.96]",
        className
      )}
      data-slot="emoji-picker-emoji"
    >
      {emoji.emoji}
    </button>
  );
}

function EmojiPickerCategoryHeader({
  category,
  ...props
}: EmojiPickerListCategoryHeaderProps) {
  return (
    <div
      {...props}
      className="bg-popover text-muted-foreground px-3 pb-2 pt-3.5 text-xs font-medium leading-none"
      data-slot="emoji-picker-category-header"
    >
      {category.label}
    </div>
  );
}

function EmojiPickerContent({
  className,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Viewport>) {
  return (
    <EmojiPickerPrimitive.Viewport
      className={cn("outline-hidden relative flex-1", className)}
      data-slot="emoji-picker-viewport"
      {...props}
    >
      <EmojiPickerPrimitive.Loading
        className="absolute inset-0 flex items-center justify-center text-muted-foreground"
        data-slot="emoji-picker-loading"
      >
        <LoaderIcon className="size-4 animate-spin" />
      </EmojiPickerPrimitive.Loading>
      <EmojiPickerPrimitive.Empty
        className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm"
        data-slot="emoji-picker-empty"
      >
        No emoji found.
      </EmojiPickerPrimitive.Empty>
      <EmojiPickerPrimitive.List
        className="select-none pb-1"
        components={{
          Row: EmojiPickerRow,
          Emoji: EmojiPickerEmoji,
          CategoryHeader: EmojiPickerCategoryHeader,
        }}
        data-slot="emoji-picker-list"
      />
    </EmojiPickerPrimitive.Viewport>
  );
}

const SKIN_TONE_COLORS: Record<string, string> = {
  none: "#FFCC4D",
  light: "#FADCBC",
  "medium-light": "#E0BB95",
  medium: "#D08B5B",
  "medium-dark": "#A56635",
  dark: "#6E4A35",
};

function EmojiPickerSkinTone({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <EmojiPickerPrimitive.SkinTone>
      {({ skinTone, setSkinTone, skinToneVariations }) => {
        const handleClick = () => {
          const currentIndex = skinToneVariations.findIndex(
            (variation) => variation.skinTone === skinTone
          );
          const next =
            skinToneVariations[
              (currentIndex + 1) % skinToneVariations.length
            ];
          setSkinTone(next.skinTone);
        };

        return (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleClick}
            aria-label={`Skin tone: ${skinTone}`}
            className={cn("shrink-0", className)}
            data-slot="emoji-picker-skin-tone"
            {...props}
          >
            <span
              className="size-4 rounded-full"
              style={{ backgroundColor: SKIN_TONE_COLORS[skinTone] }}
            />
          </Button>
        );
      }}
    </EmojiPickerPrimitive.SkinTone>
  );
}

export {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
  EmojiPickerSkinTone,
  EmojiPickerDragProvider,
};