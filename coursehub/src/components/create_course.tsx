"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"

type Variants = {
    label: string
    value: string
}

const vars_: Variants[] = [
    { label: "Variant 1", value: "/1.jpg" },
    { label: "Variant 2", value: "/2.jpg" },
    { label: "Variant 3", value: "/3.jpg" },
]

const DESCRIPTION_MAX_LENGTH = 70

export default function CreateCourse() {
    const router = useRouter()

    const [courseName, setCourseName] = useState("")
    const [courseDescription, setCourseDescription] = useState("")
    const [selectedVariant, setSelectedVariant] = useState<Variants | null>(vars_[0])

    const [isLoading, setIsLoading] = useState<boolean>(false)

    const handleCreate = async () => {
        try {
            if (!confirm("Submit the form ?")) {
                return
            }

            if (courseName.trim() === "" || courseDescription.trim() === "") {
                alert("All forms must be filled !")
                return
            }

            setIsLoading(true)

            const res = await fetch(`/api_course/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    course_name: courseName,
                    course_description: courseDescription,
                    course_thumbnail: selectedVariant?.value,
                }),
            })

            if (!res.ok) {
                alert("Failed to create course")
                return
            }

            alert(`Course "${courseName}" created successfully !`)
            setCourseName("")
            setCourseDescription("")
        }
        catch (error) {
            alert("Error while creating a course")
        }
        finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full px-4">
            <div className="w-full max-w-md">
                <h1 className="text-2xl font-bold mb-1">Create a Course</h1>
                <p className="text-sm text-gray-500 mb-6">
                    Fill in the details below to set up a new course
                </p>

                <div className="flex flex-col gap-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Course Thumbnail</label>
                        {selectedVariant ? (
                            <div className="relative w-full h-40 mb-2 rounded-lg overflow-hidden border">
                                <Image src={selectedVariant.value} alt="Course preview" fill className="object-cover" />
                            </div>
                        ) : (
                            <div className="w-full h-40 mb-2 rounded-lg border border-dashed flex items-center justify-center text-sm text-gray-400">
                                No image selected
                            </div>
                        )}
                        <Combobox
                            items={vars_}
                            itemToStringValue={(variant) => variant.label}
                            value={selectedVariant}
                            onValueChange={(variant) => setSelectedVariant(variant)}
                        >
                            <ComboboxInput placeholder="Select a thumbnail" />
                            <ComboboxContent>
                                <ComboboxEmpty>No items found.</ComboboxEmpty>
                                <ComboboxList>
                                    {(variant) => (
                                        <ComboboxItem key={variant.value} value={variant}>
                                            {variant.label}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Course Name</label>
                        <Input
                            placeholder="Your desire course name"
                            value={courseName}
                            onChange={(e) => setCourseName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Description</label>
                        <Textarea
                            placeholder="Briefly describe this course..."
                            value={courseDescription}
                            onChange={(e) => setCourseDescription(e.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
                            maxLength={DESCRIPTION_MAX_LENGTH}
                            rows={5}
                        />
                        <p className="text-xs text-gray-400 text-right mt-1">
                            {courseDescription.length}/{DESCRIPTION_MAX_LENGTH}
                        </p>
                    </div>
                </div>

                <div className="flex flex-row justify-end gap-2 mt-6">
                    <Button className="px-5" onClick={handleCreate}>Create Course</Button>
                </div>
            </div>
        </div>
    )
}