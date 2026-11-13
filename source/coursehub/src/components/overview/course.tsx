"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState, useEffect, useSyncExternalStore } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@/components/ui/input-group";

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import CourseCalendar, { useTodayKey } from "@/components/calendar/course_calendar"
import { formatLongDate } from "@/lib/appointments"
import UpcomingLate from "@/components/calendar/upcoming_late"

const subscribe = () => () => { };

type my_tasks = {
    task_id: number;
    task_name: string;
    task_due_date: string;
    status?: string;
}

type my_activities = {
    activity_id: number,
    activity_name: string,
    activity_type: string,
    activity_date: string,
}

type latest_announcement_props = {
    announcement_id: number,
    announcement_owner_id: number,
    creator: string,
    title: string,
    description: string,
    comment_count: number,
    createdAt: string,
    updatedAt: string,
}

const statusColor: Record<string, string> = {
    "To-Do": "bg-gray-100 text-gray-700",
    "In-Progress": "bg-amber-100 text-amber-700",
    Done: "bg-green-100 text-green-700",
}

function getInitials(name: string) {
    return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("")
}

function formatDate(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(date)
}

export default function CoursePage() {
    const [copied, setCopied] = useState(false);
    const router = useRouter();
    const { id: courseId } = useParams<{ id: string }>();

    const [courseTitle, setCourseTitle] = useState("Loading Title...");
    const [courseDescription, setCourseDescription] = useState("Loading Description...");
    const [totalLecturer, setTotalLecturer] = useState<string>("N/A");
    const [totalTA, setTotalTA] = useState<string>("N/A");

    const [latestAnnouncement, setLatestAnnouncement] = useState<latest_announcement_props | null>(null);
    const [myTasks, setMyTasks] = useState<my_tasks[]>([]);
    const [myActivities, setMyActivities] = useState<my_activities[]>([]);
    const [hoveredDate, setHoveredDate] = useState<string | null>(null);
    const [pickedDate, setPickedDate] = useState<string | null>(null);

    // show today until a date is picked
    const todayKey = useTodayKey();
    const selectedDate = pickedDate ?? todayKey;
    const dayTasks = myTasks.filter((t) => t.task_due_date === selectedDate);
    const dayActivities = myActivities.filter((a) => a.activity_date === selectedDate);
    const dayCount = dayTasks.length + dayActivities.length;

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

        const get_latest_announcement = async () => {
            try {
                const res = await fetch(`/api_course/get_details/get_latest_announcement?course_id=${courseId}`);
                if (res.ok) {
                    const data = await res.json();
                    setLatestAnnouncement(data);
                }
                else {
                    setLatestAnnouncement(null);
                }
            } catch (error) {
                console.error("Error fetching latest announcement", error)
                setLatestAnnouncement(null)
            }
        }

        get_course_details();
        get_course_numbers();
        get_my_tasks();
        get_my_activities();
        get_latest_announcement();
    }, [courseId]);

    return (
        <div className="flex w-full min-w-0 flex-col md:p-10 overflow-y-auto gap-8 scrollbar-none">
            <div className="flex flex-col items-start gap-4">
                <div className="text-4xl font-semibold tracking-tight text-brand-ink">{courseTitle}</div>
                <div className="text-2xl">{courseDescription}</div>

                <div className="grid grid-cols-2 gap-30">
                    <div className="text-lg">Total Lecturers - {totalLecturer}</div>
                    <div className="text-lg">Total TAs - {totalTA}</div>
                </div>
            </div>

            <div className="">
                <div className="flex flex-col items-start justify-center gap-1 w-full pb-4">
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

                        <Button onClick={() => window.open(courseUrl, "_blank")} className="px-10 font-lg font-bold">open</Button>
                        <Button onClick={() => router.push(`/courses/${courseId}/edit`)} variant="outline" className="px-15 font-lg font-bold">
                            Edit Course
                        </Button>
                    </div>
                </div>

                <Card className="flex flex-col h-auto w-full bg-gray-100 shadow-lg p-7">
                    <h2 className="text-xl font-bold">Latest Announcements</h2>

                    {latestAnnouncement ? (
                        <button
                            type="button"
                            onClick={() => router.push(`/courses/${courseId}/announcement`)}
                            className="mt-3 flex min-h-0 flex-1 flex-col rounded-lg bg-white px-4 py-3 text-left transition-shadow hover:shadow-md"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-brand-ink">
                                    {getInitials(latestAnnouncement.creator)}
                                </div>
                                <span className="truncate text-sm font-semibold">{latestAnnouncement.creator}</span>
                                <span className="text-xs text-gray-500">{formatDate(latestAnnouncement.createdAt)}</span>
                                <span className="ml-auto shrink-0 text-xs text-gray-500">
                                    {latestAnnouncement.comment_count} comment{latestAnnouncement.comment_count === 1 ? "" : "s"}
                                </span>
                            </div>
                            <span className="mt-2 truncate font-medium">{latestAnnouncement.title}</span>
                            <span className="line-clamp-1 text-sm text-gray-500">{latestAnnouncement.description || "—"}</span>
                        </button>
                    ) : (
                        <p className="mt-3 text-sm text-gray-500">No announcements yet.</p>
                    )}
                </Card>
            </div>

            <div className="flex flex-row gap-6">
                <div className="basis-2/3">
                    <CourseCalendar
                        dueTasks={myTasks.map((t) => ({ date: t.task_due_date, title: t.task_name }))}
                        activities={myActivities.map((a) => ({ date: a.activity_date, title: a.activity_name, type: a.activity_type }))}
                        highlightDate={hoveredDate}
                        selectedDate={selectedDate}
                        onSelect={setPickedDate}
                    />
                </div>
                <div className="relative basis-1/3 min-w-0">
                    <Card className="absolute inset-0 flex flex-col bg-gray-100 shadow-lg p-7 gap-5 overflow-y-auto scrollbar-hidden">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-xl font-bold">{selectedDate ? formatLongDate(selectedDate) : "\u00a0"}</h2>
                            <p className="text-sm text-gray-500">
                                {dayCount} {dayCount === 1 ? "item" : "items"} on this date
                            </p>
                        </div>

                        {dayCount === 0 ? (
                            <p className="py-6 text-center text-sm text-gray-500">Nothing on this date.</p>
                        ) : (
                            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto scrollbar-none">
                                {dayActivities.map((a) => {
                                    const isMilestone = a.activity_type === "Milestones";
                                    return (
                                        <button
                                            key={`a${a.activity_id}`}
                                            type="button"
                                            onClick={() => router.push(`/courses/${courseId}/acmil/${a.activity_id}`)}
                                            className="flex flex-col gap-1 rounded-xl bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md"
                                        >
                                            <span className="flex items-center gap-3">
                                                <span className={`h-1.5 w-5 shrink-0 rounded-full ${isMilestone ? "bg-violet-500" : "bg-amber-500"}`} />
                                                <span className="flex-1 truncate text-lg font-semibold">{a.activity_name}</span>
                                            </span>
                                            <span className="pl-8 text-sm text-gray-500">{isMilestone ? "Milestone" : "Activity"}</span>
                                        </button>
                                    );
                                })}

                                {dayTasks.map((t) => (
                                    <button
                                        key={`t${t.task_id}`}
                                        type="button"
                                        onClick={() => router.push(`/courses/${courseId}/task`)}
                                        className="flex flex-col gap-1 rounded-xl bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="h-1.5 w-5 shrink-0 rounded-full bg-green-500" />
                                            <span className="flex-1 truncate text-lg font-semibold">{t.task_name}</span>
                                            {t.status && (
                                                <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${statusColor[t.status] ?? "bg-gray-100 text-gray-700"}`}>
                                                    {t.status}
                                                </span>
                                            )}
                                        </span>
                                        <span className="pl-8 text-sm text-gray-500">Task due</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            <div className="flex flex-col w-full h-70 shrink-0 [&>div>div]:rounded-xl [&>div>div]:bg-gray-100 [&>div>div]:p-7 [&>div>div]:shadow-lg">
                <UpcomingLate tasks={myTasks} activities={myActivities} onHoverDate={setHoveredDate} />
            </div>
        </div>
    );
};