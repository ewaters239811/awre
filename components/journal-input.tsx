"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CHECK_IN_JOURNAL_LIMIT } from "@/lib/check-in-session";

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function JournalInput({
  value,
  onChange,
  disabled = false,
  label = "Journal",
  id = "check-in-journal",
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<Recognition | null>(null);
  useEffect(() => {
    const speech = window as SpeechWindow;
    queueMicrotask(() =>
      setSupported(
        Boolean(speech.SpeechRecognition || speech.webkitSpeechRecognition),
      ),
    );
    return () => {
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onresult = null;
        recognition.onend = null;
        recognition.onerror = null;
        recognition.stop();
      }
    };
  }, []);
  useEffect(() => {
    if (disabled && recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.stop();
      queueMicrotask(() => setListening(false));
    }
  }, [disabled]);
  const toggleSpeech = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const speech = window as SpeechWindow;
    const Constructor =
      speech.SpeechRecognition || speech.webkitSpeechRecognition;
    if (!Constructor || disabled) return;
    const recognition = new Constructor();
    const base = value.trimEnd();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      onChange(`${base} ${transcript}`.trim().slice(0, CHECK_IN_JOURNAL_LIMIT));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setError("Voice input couldn't start. You can type your entry instead.");
    };
    recognitionRef.current = recognition;
    setError("");
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError("Voice input couldn't start. You can type your entry instead.");
    }
  };
  return (
    <section
      id="journal"
      className="scroll-mt-24 border-t border-border/45 pt-8"
      aria-labelledby={`${id}-heading`}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id={`${id}-heading`} className="font-serif text-2xl font-semibold">
          <label htmlFor={id}>{label}</label>
        </h2>
        {supported ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full"
            aria-label={listening ? "Stop dictation" : "Speak journal entry"}
            aria-pressed={listening}
            title={listening ? "Stop dictation" : "Speak journal entry"}
            disabled={disabled}
            onClick={toggleSpeech}
          >
            {listening ? (
              <MicOff className="h-5 w-5" aria-hidden />
            ) : (
              <Mic className="h-5 w-5" aria-hidden />
            )}
          </Button>
        ) : null}
      </div>
      <p
        id={`${id}-help`}
        className="mt-3 text-sm leading-7 text-muted-foreground"
      >
        What are you thinking, feeling, and doing as you move toward your
        desired reality?
      </p>
      <Textarea
        id={id}
        className="mt-4 min-h-48 resize-y bg-transparent text-base leading-7"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Start wherever you are today..."
        rows={7}
        required
        maxLength={CHECK_IN_JOURNAL_LIMIT}
        disabled={disabled || listening}
        aria-describedby={`${id}-help`}
      />
      {listening ? (
        <p role="status" className="mt-2 text-sm text-primary">
          Listening...
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-primary">
          {error}
        </p>
      ) : null}
    </section>
  );
}
