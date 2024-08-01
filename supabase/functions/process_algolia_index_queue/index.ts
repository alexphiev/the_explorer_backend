import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import algoliasearch from "https://esm.sh/algoliasearch@4.14.3";
import { Database } from "../types/supabase.ts";
import { Place } from "../types/place.ts";
// import { createFetchRequester } from "@algolia/requester-fetch"; Better option
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const algoliaAppId = Deno.env.get("ALGOLIA_APP_ID")!;
const algoliaApiKey = Deno.env.get("ALGOLIA_API_KEY")!;

const supabase = createClient<Database>(supabaseUrl, supabaseKey);
const algolia = algoliasearch(algoliaAppId, algoliaApiKey);
const prefix = Deno.env.get("ALGOLIA_INDEX_PREFIX") || "";
const index = algolia.initIndex(`${prefix}_nature_places`);

interface QueueItem {
  id: number;
  payload: {
    operation: "INSERT" | "UPDATE" | "DELETE";
    table: string;
    record: Place;
  };
}

async function processQueue() {
  const batchSize = 100;
  let processedCount = 0;

  while (true) {
    console.log("Process count:", processedCount);
    const { data: items, error } = await supabase
      .from("algolia_sync_queue")
      .select("id, payload")
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (error) throw new Error(`Failed to fetch queue items: ${error.message}`);
    if (!items || items.length === 0) break;

    try {
      await processItems(items);
      processedCount = processedCount + items.length;
    } catch (error) {
      console.error("Error processing items:", error);
      break;
    }
  }

  return processedCount;
}

async function processItems(items: QueueItem[]) {
  const saveRecords = [];
  const deleteRecords = [];

  // Separate items into save and delete batches
  for (const item of items) {
    if (item.payload.operation === "DELETE") {
      deleteRecords.push(item.payload.record.id);
    } else {
      const { id, names, _geoloc, categories } = item.payload.record;

      // Store selected columns to be indexed
      saveRecords.push({
        objectID: id,
        name: names.primary,
        _geoloc,
        main_category: categories.main,
        alternate_categories: categories.alternate,
      });
    }
  }

  // Perform batch indexing operation
  if (saveRecords.length > 0) {
    await index.saveObjects(saveRecords);
  }

  if (deleteRecords.length > 0) {
    await index.deleteObjects(deleteRecords);
  }

  await removeProcessedItems(items.map((item) => item.id));
}

async function removeProcessedItems(itemIds: number[]) {
  const { error } = await supabase
    .from("algolia_sync_queue")
    .delete()
    .in("id", itemIds);

  if (error) {
    throw new Error(`Failed to remove items: ${error.message}`);
  }
}

serve(async () => {
  console.log("Function process_algolia_index_queue is running...");
  try {
    const processedCount = await processQueue();
    return new Response(JSON.stringify({ success: true, processedCount }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing queue:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
