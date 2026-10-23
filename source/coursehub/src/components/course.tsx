"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@/components/ui/input-group";

import { Button } from "@/components/ui/button"

export default function CoursePage() {
    const [copied, setCopied] = useState(false);
    const { id: courseId } = useParams<{ id: string }>()
    const [courseUrl, setCourseUrl] = useState("")

    useEffect(() => {
        setCourseUrl(`${window.location.origin}/students/${courseId}`)
    }, [courseId])

    const handleCopy = async () => {
        await navigator.clipboard.writeText(courseUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-cols items-center justify-center">
            <div className="flex flex-col items-start justify-center gap-1">
                <h1>Student URL</h1>

                <div className="flex flex-row items-center justify-center gap-2">
                    <InputGroup className="w-full w-100 bg-background">
                        <InputGroupInput aria-label="Link" readOnly type="url" value={courseUrl} />
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton
                                aria-label={copied ? "Copied" : "Copy"}
                                onClick={handleCopy}
                                size="icon-xs"
                            >
                                {copied ? (
                                    <CheckIcon aria-hidden="true" />
                                ) : (
                                    <CopyIcon aria-hidden="true" />
                                )}
                            </InputGroupButton>
                        </InputGroupAddon>
                    </InputGroup>

                    <Button onClick={() => window.open(courseUrl, "_blank")} className="px-5">open</Button>
                </div>

            </div>
        </div>
    );
};