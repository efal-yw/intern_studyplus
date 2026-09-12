import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import PostTime from "./postTime";

type Post = Database["public"]["Tables"]["posts"]["Row"];

export default async function RecordPost({ post_info }: { post_info: Post }) {
    const supabase = await createClient();

    const { data: author, error: authorError } = await supabase
        .from("users")
        .select("name")
        .eq("id", post_info.user_id)
        .single();

    const { data: postRecord, error: postRecordError } = await supabase
        .from("post_record")
        .select("*")
        .eq("post_id", post_info.post_id)
        .maybeSingle();

    if (authorError) {
        console.error("author fetch failed:", authorError);
    }

    if (postRecordError) {
        console.error("post_record fetch failed:", postRecordError);
    }

    const record = { ...post_info, ...postRecord };
    const { data: textbook, error: textbookError } = record.textbook
        ? await supabase
              .from("textbook")
              .select("name")
              .eq("id", record.textbook)
              .single()
        : { data: null, error: null };

    if (textbookError) {
        console.error("textbook fetch failed:", textbookError);
    }

    return (
        <div>
            <div className="flex items-center gap-2">
                <p>{author?.name}</p>
                <PostTime createdAt={record.created_at} />
            </div>
            <div>
                <div>{textbook?.name}</div>
                {record.hours != null && record.minutes != null ? (
                    <p>
                        {record.hours}時間{record.minutes}分
                    </p>
                ) : null}
            </div>
            {record.note && <p>{record.note}</p>}
        </div>
    );
};