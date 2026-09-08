"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import { mock_courses } from "@/lib/mock_data"

import { Edit, Trash } from "lucide-react"

export default function CoursesPage() {
    const router = useRouter()

    return (
        <div className="flex flex-col justify-top items-center h-screen w-max pt-7 overflow-y-auto scrollbar-none gap-4 xl:w-250 lg:w-200 md:w-150 sm:w-100 min-w-90">
            <div className="flex flex-row justiffy-center items-center gap-4 w-full h-35">
                <div className="bg-[#E8E8E8] w-full h-full rounded-xl">
                </div>

                <div className="bg-[#E8E8E8] w-full h-full rounded-xl">
                </div>
            </div>

            <div className="flex flex-row items-center justify-center w-full gap-4">
                <Input placeholder="Search courses" className="" />
                <Button className="w-25">Search</Button>
            </div>

            {mock_courses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 w-full">
                    {mock_courses.map((course, index_) => (
                        <div key={index_} className="pb-4 bg-[#006C67] rounded-xl">
                            <Image
                                alt="coursebg"
                                src="/boardbg.png"
                                width={10}
                                height={10}
                                className="w-full rounded-tr-xl rounded-tl-xl"
                            />

                            <div className="w-full h-[2px] bg-[#FFFFFF] rounded-xl mb-3"></div>

                            <h1 className="px-5 text-white">{course.course_name}</h1>
                            <h2 className="px-5 text-white text-[13px]">{course.course_description}</h2>

                            <div className="px-5 flex flex-row justify-between items-center mt-4">
                                <div className="">
                                    <Button><Trash /></Button>
                                    <Button className="ml-1"><Edit /></Button>
                                </div>

                                <Button className="w-25">View</Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <h1>No Assigned Courses</h1>
            )}
        </div>
    )
}