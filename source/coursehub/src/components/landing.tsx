"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

import { Button } from "@/components/ui/button"

import { FcGoogle } from "react-icons/fc"

export default function LandingPage() {
    const handle_submit = () => {
        try {
            window.location.href = "/api_auth/auth"
        }
        catch (error) {
            alert("Error while trting to login")
            console.error(error)
        }
    }

    return (
        <div className="flex flex-row items-center h-screen">
            <div className="self-start w-8 bg-[#006C67] h-screen fixed" />
            <div className="flex flex-col items-center justify-center pl-25">
                <h1 className="font-bold text-[72px] self-start">CourseHub</h1>
                <h2 className="w-160 text-[20px]">A platform that centralizes course tasks, announcements, and FAQs to keep lecturers, TAs, and student in sync.</h2>
                <Button className="self-start px-4 mt-8 gap-3 font-bold h-9" onClick={handle_submit}>
                    <FcGoogle />
                    Continue with Google
                </Button>
            </div>
            <div className="relative h-screen flex-1 ml-25">
                <Image
                    src="/classroom_img.jpeg"
                    alt="classroom"
                    fill
                    className="object-cover"
                    priority
                />
            </div>
        </div>
    )
}