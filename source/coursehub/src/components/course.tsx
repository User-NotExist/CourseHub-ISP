"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@/components/ui/input-group";

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const subscribe = () => () => { };

export default function CoursePage() {
    const [copied, setCopied] = useState(false);
    const { id: courseId } = useParams<{ id: string }>();

    const origin = useSyncExternalStore(
        subscribe,
        () => window.location.origin, // client
        () => ""                      // server
    );

    const courseUrl = `${origin}/students/${courseId}`;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(courseUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex w-full min-w-0 flex-col p-7 md:p-10 h-screen">
            <div className="flex flex-col items-start gap-4">
                <div className="text-3xl font-semibold tracking-tight text-brand-ink">Course Title</div>
                <div>Course Description</div>

                <div className="grid grid-cols-2 gap-30">
                    <div>Total Lecturer</div>
                    <div>Total TA</div>
                </div>

            </div>

            <div className="py-4 flex flex-col items-start justify-center gap-1 w-full">
                <h1>Student URL</h1>
                <div className="flex flex-row items-center justify-center gap-2 w-full">
                    <InputGroup className="bg-background">
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

                    <Button onClick={() => window.open(courseUrl, "_blank")} className="px-10">open</Button>
                </div>

            </div>

            <Card className="h-full w-full bg-gray-100 shadow-lg p-7">

            </Card>
        </div>
    );
};