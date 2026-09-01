"use client"
import {Link} from "next/link";
import Post from "/record_post";

export default function recordHeader(){
    return (
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-center border-b border-black/[.08] bg-white">
            <Link href="./record">x</Link>
            <h1 className="text-base font-semiboxd text-black">記録する</h1>
            <Post />
    </header>
  );
}