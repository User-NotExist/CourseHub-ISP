"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function CreateCourse() {
    const router = useRouter()

    const [courseName, setCourseName] = useState("")
    const [courseDescription, setCourseDescription] = useState("")
    const [coursePicture, setCoursePicture] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null
        setCoursePicture(file)
        setPreviewUrl(file ? URL.createObjectURL(file) : null)
    }

    const handleCreate = () => {

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
                        <label className="text-sm font-medium mb-1 block">Course Picture</label>
                        {previewUrl ? (
                            <div className="relative w-full h-40 mb-2 rounded-lg overflow-hidden border">
                                <Image src={previewUrl} alt="Course preview" fill className="object-cover" />
                            </div>
                        ) : (
                            <div className="w-full h-40 mb-2 rounded-lg border border-dashed flex items-center justify-center text-sm text-gray-400">
                                No image selected
                            </div>
                        )}
                        <Input type="file" accept="image/*" onChange={handleFileChange} />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Course Name</label>
                        <Input
                            placeholder="e.g. ISP-101"
                            value={courseName}
                            onChange={(e) => setCourseName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Description</label>
                        <Textarea
                            placeholder="Briefly describe this course..."
                            value={courseDescription}
                            onChange={(e) => setCourseDescription(e.target.value)}
                            rows={5}
                        />
                    </div>
                </div>

                <div className="flex flex-row justify-end gap-2 mt-6">
                    <Button className="px-5" onClick={handleCreate}>Create Course</Button>
                </div>
            </div>
        </div>
    )
}