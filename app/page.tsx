"use client";
import "highlight.js/styles/github-dark.css";
import { useState, useMemo } from "react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import sql from "highlight.js/lib/languages/sql";
import java from "highlight.js/lib/languages/java";
import go from "highlight.js/lib/languages/go";
import json from "highlight.js/lib/languages/json";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("java", java);
hljs.registerLanguage("go", go);
hljs.registerLanguage("json", json);

// Copyable placeholder button component
function InjectCopy({ placeholder }: { placeholder: string }) {
    return (
        <button
            type="button"
            className="inline-flex items-center group"
            onClick={() => navigator.clipboard.writeText(placeholder)}
        >
            <code className="cursor-pointer bg-gray-200 dark:bg-neutral-700 rounded px-1 font-mono text-xs transition-all group-hover:bg-gray-300 dark:group-hover:bg-neutral-600 group-active:bg-gray-400 dark:group-active:bg-neutral-500 group-active:translate-y-px">
                {placeholder}
            </code>
        </button>
    );
}

function analyzeClosure(code: string) {
    const stack: string[] = [];
    const problems: string[] = [];
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;
    let inBlockComment = false;
    for (let i = 0; i < code.length; i++) {
        const ch = code[i];
        const next = code[i + 1];
        const prev = code[i - 1];

        // Handle block comments /* */
        if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
            if (!inBlockComment && ch === "/" && next === "*") {
                inBlockComment = true;
                i++;
                continue;
            }
            if (inBlockComment && ch === "*" && next === "/") {
                inBlockComment = false;
                i++;
                continue;
            }
            if (inBlockComment) continue;
        }

        // Skip single line comments //, --, or bash-style #
        // (Bash: '#' starts a comment when not inside quotes/backticks and not escaped with backslash)
        if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
            // Existing styles
            if ((ch === "/" && next === "/") || (ch === "-" && next === "-")) {
                while (i < code.length && code[i] !== "\n") i++;
                continue;
            }
            // New: Bash / shell comment
            if (ch === "#" && prev !== "\\" /* allow escaped \# */) {
                while (i < code.length && code[i] !== "\n") i++;
                continue;
            }
        }

        // Handle quotes
        if (!inDoubleQuote && !inBacktick && ch === "'") {
            inSingleQuote = !inSingleQuote;
            continue;
        }
        if (!inSingleQuote && !inBacktick && ch === '"') {
            inDoubleQuote = !inDoubleQuote;
            continue;
        }
        if (!inSingleQuote && !inDoubleQuote && ch === "`") {
            inBacktick = !inBacktick;
            continue;
        }

        // If inside any quote, ignore braces
        if (inSingleQuote || inDoubleQuote || inBacktick) continue;

        // Handle brackets
        if ("({[".includes(ch)) {
            stack.push(ch);
        } else if (")}]".includes(ch)) {
            const open = stack.pop();
            if (!open) {
                problems.push(`Extra closing ${ch} at position ${i}`);
            } else {
                const pair: Record<string, string> = {
                    "(": ")",
                    "[": "]",
                    "{": "}",
                };
                if (pair[open] !== ch) {
                    problems.push(
                        `Mismatched ${open} and ${ch} at position ${i}`,
                    );
                }
            }
        }
    }

    if (stack.length) problems.push("Not all brackets are closed");
    if (inSingleQuote) problems.push("Single quote is not closed");
    if (inDoubleQuote) problems.push("Double quote is not closed");
    if (inBacktick) problems.push("Backtick is not closed");
    if (inBlockComment) problems.push("Block comment is not closed");

    return { balanced: problems.length === 0, problems };
}

export default function Home() {
    const [command, setCommand] = useState("");
    const [injections, setInjections] = useState<string[]>([""]);
    const [language, setLanguage] = useState("auto");

    const updateInjection = (index: number, value: string) => {
        setInjections((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    };

    const addInjection = () => setInjections((prev) => [...prev, ""]);

    const removeInjection = (index: number) => {
        setInjections((prev) => {
            if (prev.length === 1) return prev; // Keep at least one injection
            const next = prev.filter((_, i) => i !== index);
            return next;
        });
    };

    const combined = useMemo(() => {
        let result = command;
        const hasFirstPlaceholder = command.includes("{{INJECT}}");

        injections.forEach((inj, idx) => {
            const placeholder =
                idx === 0 ? "{{INJECT}}" : `{{INJECT${idx + 1}}}`;

            if (result.includes(placeholder)) {
                result = result.split(placeholder).join(inj);
            } else if (idx === 0 && !hasFirstPlaceholder) {
                // Only append the first injection to the end if no {{INJECT}} is present in the command
                result = `${result} ${inj}`;
            }
            // Otherwise, ignore if the corresponding placeholder is not found
        });

        return result.trim();
    }, [command, injections]);

    // Click to copy {{INJECT}} placeholder

    const analysis = useMemo(() => analyzeClosure(combined), [combined]);

    const highlightRes = useMemo(() => {
        if (!combined.trim()) return { html: "", lang: "" };
        if (language === "auto") {
            const res = hljs.highlightAuto(combined);
            return { html: res.value, lang: res.language || "unknown" };
        }
        try {
            const res = hljs.highlight(combined, { language });
            return { html: res.value, lang: language };
        } catch {
            const fallback = hljs.highlightAuto(combined);
            return {
                html: fallback.value,
                lang: fallback.language || "unknown",
            };
        }
    }, [combined, language]);

    const highlighted = highlightRes.html;
    const detectedLang = highlightRes.lang;

    return (
        <main className="min-h-screen p-8 flex flex-col gap-8 bg-gray-100 dark:bg-neutral-900 mx-auto max-w-4xl">
            <h1 className="text-3xl font-bold text-center">
                Injection Monitor
            </h1>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Real-time command injection monitor with syntax highlighting and
                balance analysis.
            </p>
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col flex-1 gap-2">
                    <label className="font-medium">Command</label>
                    <textarea
                        className="p-2 rounded border resize-y min-h-[120px] dark:bg-neutral-800 dark:text-white"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        placeholder="e.g. dig '{{INJECT}}';"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        Insert placeholder like{" "}
                        <InjectCopy placeholder="{{INJECT}}" /> or{" "}
                        <InjectCopy placeholder="{{INJECT2}}" /> ... to specify
                        position. If no placeholder exists, the first injection
                        will append to the end.
                    </span>
                </div>
                <div className="flex flex-col flex-1 gap-2">
                    <label className="font-medium">Injection List</label>
                    {injections.map((inj, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                            <textarea
                                className="p-2 rounded border resize-y min-h-[80px] dark:bg-neutral-800 dark:text-white"
                                value={inj}
                                onChange={(e) =>
                                    updateInjection(idx, e.target.value)
                                }
                                placeholder={
                                    idx === 0
                                        ? "e.g. '; whoami;'"
                                        : `Injection ${idx + 1}`
                                }
                            />
                            <div className="flex items-center gap-2">
                                <InjectCopy
                                    placeholder={
                                        idx === 0
                                            ? "{{INJECT}}"
                                            : `{{INJECT${idx + 1}}}`
                                    }
                                />
                                {injections.length > 1 && (
                                    <button
                                        type="button"
                                        className="text-red-500 text-xs hover:underline"
                                        onClick={() => removeInjection(idx)}
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    <button
                        type="button"
                        className="mt-2 self-start text-sm bg-gray-200 dark:bg-neutral-700 px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-neutral-600 transition-colors"
                        onClick={addInjection}
                    >
                        + Add Injection
                    </button>
                </div>
            </div>

            <section className="flex flex-col gap-4">
                <h2 className="text-xl font-semibold">Analysis Result</h2>
                {analysis.balanced ? (
                    <p className="text-green-600">Balanced: OK ✅</p>
                ) : (
                    <ul className="list-disc pl-6 text-red-600">
                        {analysis.problems.map((p) => (
                            <li key={p}>{p}</li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">Syntax Highlight</h2>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="border rounded p-1 text-sm dark:bg-neutral-800 dark:text-white"
                    >
                        <option value="auto">Auto</option>
                        <option value="javascript">JavaScript</option>
                        <option value="typescript">TypeScript</option>
                        <option value="python">Python</option>
                        <option value="bash">Bash</option>
                        <option value="sql">SQL</option>
                        <option value="java">Java</option>
                        <option value="go">Go</option>
                        <option value="json">JSON</option>
                    </select>
                </div>
                <p className="text-sm text-gray-500">
                    Detected language: {detectedLang || "N/A"}
                </p>
                <pre className="rounded bg-neutral-900 text-white overflow-auto p-4">
                    <code
                        className="hljs"
                        dangerouslySetInnerHTML={{
                            __html: highlighted || "// no content",
                        }}
                    />
                </pre>
            </section>

            <footer className="mt-12 border-t pt-4 flex flex-col items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>
                    Made by{" "}
                    <a
                        href="https://vincent55.tw"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline hover:text-blue-600"
                    >
                        Vincent55
                    </a>
                </span>
                <a
                    href="https://github.com/Vincent550102/injection-monitor/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-blue-600"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.867 8.166 6.839 9.489.5.091.682-.217.682-.483 0-.237-.009-.868-.014-1.703-2.782.604-3.369-1.343-3.369-1.343-.454-1.154-1.11-1.462-1.11-1.462-.907-.62.069-.607.069-.607 1.002.07 1.53 1.03 1.53 1.03.892 1.528 2.341 1.087 2.91.832.091-.647.35-1.087.636-1.337-2.222-.253-4.555-1.111-4.555-4.944 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.272.098-2.65 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.748-1.025 2.748-1.025.546 1.378.203 2.397.1 2.65.64.699 1.028 1.592 1.028 2.683 0 3.842-2.337 4.687-4.566 4.936.359.309.678.92.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.013 10.013 0 0 0 22 12c0-5.523-4.477-10-10-10Z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <span>GitHub Repo</span>
                </a>
            </footer>
        </main>
    );
}
