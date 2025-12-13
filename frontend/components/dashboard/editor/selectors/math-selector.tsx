"use client";

import { Sigma } from "lucide-react";
import { useEditor } from "novel";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

// Dynamically import katex to avoid SSR issues
let katex: any = null;
if (typeof window !== "undefined") {
    import("katex").then((module) => {
        katex = module.default;
    });
}

/**
 * MathSelector Component
 * 
 * A dialog for inserting and editing mathematical expressions using LaTeX syntax.
 * Provides live preview of the rendered math expression using KaTeX.
 * 
 * Features:
 * - LaTeX input field
 * - Live KaTeX preview
 * - Insert new math expressions
 * - Edit existing math expressions
 * - Error handling for invalid LaTeX
 * - Graceful fallback when KaTeX is not loaded
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 * 
 * @returns Rendered math selector
 */
export const MathSelector = () => {
    const { editor } = useEditor();
    const [open, setOpen] = useState(false);
    const [latex, setLatex] = useState("");
    const [preview, setPreview] = useState("");
    const [error, setError] = useState("");

    // Check if we're editing an existing math node
    useEffect(() => {
        if (open && editor) {
            const { latex: existingLatex } = editor.getAttributes("mathematics");
            if (existingLatex) {
                setLatex(existingLatex);
            } else {
                setLatex("");
            }
        }
    }, [open, editor]);

    // Update preview when latex changes
    useEffect(() => {
        if (!latex) {
            setPreview("");
            setError("");
            return;
        }

        if (!katex) {
            setPreview("Loading KaTeX...");
            return;
        }

        try {
            const html = katex.renderToString(latex, {
                throwOnError: false,
                displayMode: true,
            });
            setPreview(html);
            setError("");
        } catch (err) {
            setError("Invalid LaTeX syntax");
            setPreview("");
        }
    }, [latex]);

    if (!editor) return null;

    /**
     * Handle inserting or updating the math expression
     */
    const handleInsertMath = () => {
        if (!latex.trim()) {
            toast({
                title: "Empty Expression",
                description: "Please enter a LaTeX expression.",
                variant: "destructive",
            });
            return;
        }

        try {
            // Check if we're editing an existing math node
            const { latex: existingLatex } = editor.getAttributes("mathematics");

            if (existingLatex) {
                // Update existing math node
                editor
                    .chain()
                    .focus()
                    .updateAttributes("mathematics", { latex })
                    .run();
            } else {
                // Insert new math node
                editor
                    .chain()
                    .focus()
                    .insertContent({
                        type: "mathematics",
                        attrs: { latex },
                    })
                    .run();
            }

            setOpen(false);
            setLatex("");
            setPreview("");
            setError("");
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to insert math expression.",
                variant: "destructive",
            });
        }
    };

    /**
     * Handle Enter key to insert math
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleInsertMath();
        }
    };

    /**
     * Handle dialog close
     */
    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            setLatex("");
            setPreview("");
            setError("");
        }
    };

    const isEditing = editor.getAttributes("mathematics").latex;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="ghost"
                    className="gap-2 rounded-none border-none hover:bg-accent focus:ring-0"
                    aria-label="Insert or edit math expression"
                >
                    <Sigma className="h-4 w-4" />
                    <span className="text-sm">Math</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Edit" : "Insert"} Math Expression
                    </DialogTitle>
                    <DialogDescription>
                        Enter a LaTeX expression to render mathematical notation.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* LaTeX Input */}
                    <div className="space-y-2">
                        <label htmlFor="latex-input" className="text-sm font-medium">
                            LaTeX Expression
                        </label>
                        <Input
                            id="latex-input"
                            placeholder="e.g., x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}"
                            value={latex}
                            onChange={(e) => setLatex(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="font-mono"
                            autoFocus
                        />
                        {error && (
                            <p className="text-xs text-destructive">{error}</p>
                        )}
                    </div>

                    {/* Preview */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Preview</label>
                        <div className="min-h-[80px] rounded-md border bg-muted/50 p-4 flex items-center justify-center">
                            {preview ? (
                                <div
                                    dangerouslySetInnerHTML={{ __html: preview }}
                                    className="text-foreground"
                                />
                            ) : latex ? (
                                <span className="text-sm text-muted-foreground">
                                    {error || "Rendering..."}
                                </span>
                            ) : (
                                <span className="text-sm text-muted-foreground">
                                    Preview will appear here
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Examples */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Examples</label>
                        <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="font-mono">
                                Fraction: \frac{"{a}"}{"{b}"}
                            </div>
                            <div className="font-mono">
                                Square root: \sqrt{"{x}"}
                            </div>
                            <div className="font-mono">
                                Summation: \sum_{"{i=1}"}^{"{n}"} x_i
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleInsertMath} disabled={!latex.trim() || !!error}>
                        {isEditing ? "Update" : "Insert"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
