"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState, useEffect, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@/components/ui/input-group";

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import CourseCalendar from "@/components/calendar/course_calendar"

import { useRouter } from "next/navigation";

const subscribe = () => () => { };

type my_tasks = {
    task_id: number;
    task_name: string;
    task_due_date: string;
}

type my_activities = {
    activity_id: number,
    activity_name: string,
    activity_type: string,
    activity_date: string,
}

export default function CoursePage() {
    const [copied, setCopied] = useState(false);
    const router = useRouter();
    const { id: courseId } = useParams<{ id: string }>();

    const [courseTitle, setCourseTitle] = useState("Loading Title...");
    const [courseDescription, setCourseDescription] = useState("Loading Description...");
    const [totalLecturer, setTotalLecturer] = useState<string>("N/A");
    const [totalTA, setTotalTA] = useState<string>("N/A");

    const [myTasks, setMyTasks] = useState<my_tasks[]>([]);
    const [myActivities, setMyActivities] = useState<my_activities[]>([]);

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

    useEffect(() => {
        const get_course_details = async () => {
            const response = await fetch(`/api_course/get_details/get_detail?course_id=${courseId}`);
            if (response.ok) {
                const data = await response.json();
                setCourseTitle(data.title);
                setCourseDescription(data.description);
            }
            else {
                setCourseTitle("Error loading title");
                setCourseDescription("Error loading description");
            }
        };

        const get_course_numbers = async () => {
            const response = await fetch(`/api_course/get_details/get_numbers?course_id=${courseId}`);
            if (response.ok) {
                const data = await response.json();

                const totalLecturerStr = data.num_lec.toString()
                const totalTaStr = data.num_ta.toString()

                setTotalLecturer(totalLecturerStr);
                setTotalTA(totalTaStr);
            }
            else {
                setTotalLecturer("0");
                setTotalTA("0");
            }
        };

        const get_my_tasks = async () => {
            try {
                const response = await fetch(`/api_course/get_details/get_my_task?course_id=${courseId}`);
                if (response.ok) {
                    const data = await response.json();
                    setMyTasks(data);
                }
                else {
                    setMyTasks([]);
                }
            } catch (error) {
                console.error("Error fetching my tasks:", error);
                setMyTasks([]);
            }
        }

        const get_my_activities = async () => {
            try {
                const response = await fetch(`/api_course/get_details/get_my_activity?course_id=${courseId}`);
                if (response.ok) {
                    const data = await response.json();
                    setMyActivities(data);
                }
                else {
                    setMyActivities([]);
                }
            }
            catch (error) {
                console.error("Error fetching my activities", error)
                setMyActivities([])
            }
        }

        get_course_details();
        get_course_numbers();
        get_my_tasks();
        get_my_activities();
    }, [courseId]);

    return (
        <div className="flex w-full min-w-0 flex-col p-7 md:p-10 overflow-y-auto gap-5 scrollbar-none">
            <div className="flex flex-col items-start gap-4">
                <div className="text-4xl font-semibold tracking-tight text-brand-ink">{courseTitle}</div>
                <div className="text-2xl">{courseDescription}</div>

                <div className="grid grid-cols-2 gap-30">
                    <div className="text-lg">Total Lecturers - {totalLecturer}</div>
                    <div className="text-lg">Total TAs - {totalTA}</div>
                </div>
            </div>

            <div className="flex flex-col items-start justify-center gap-1 w-full">
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
                    <Button onClick={() => router.push(`/courses/${courseId}/edit`)} variant="outline" className="px-15">
                        Edit Course
                    </Button>
                </div>
            </div>

            <Card className="flex flex-col h-50 w-full bg-gray-100 shadow-lg p-7">
                <h2 className="text-xl font-bold">Latest Announcements</h2>

                <div className="flex flex-col items-start justify-center" >
                    To be Implemented
                </div>
            </Card>

            <CourseCalendar
                dueTasks={myTasks.map((t) => ({ date: t.task_due_date, title: t.task_name }))}
                activities={myActivities.map((a) => ({ date: a.activity_date, title: a.activity_name, type: a.activity_type }))}
            />

            <Card className="flex flex-col h-60 w-full bg-gray-100 shadow-lg p-7">
                <h2 className="text-xl font-bold">Upcoming Tasks / Activities</h2>

                <div className="flex flex-col items-start justify-center" >
                    Upcoming Tasks / Activities
                </div>
            </Card>
        </div>
    );
};