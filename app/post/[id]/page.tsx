import { createClient } from "@/lib/supabase/server";
import { useParams } from "next/navigation";

async function getPostInfo() {
  //get post id
  const params = useParams<{ id: string }>();
  const post_id = params.id;

  const supabase = await createClient();
  const { _post_info, error } = await supabase
    .from("posts")
    .select("*")
    .eq("post_id", "post_id")
    .single();

  if (error) throw error;
}
