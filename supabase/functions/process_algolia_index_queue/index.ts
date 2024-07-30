import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import algoliasearch from "https://esm.sh/algoliasearch@4.14.3";
import { Place } from "../types/place.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const algoliaAppId = Deno.env.get("ALGOLIA_APP_ID")!;
const algoliaApiKey = Deno.env.get("ALGOLIA_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);
const algolia = algoliasearch(algoliaAppId, algoliaApiKey);
const index = algolia.initIndex("places");

interface QueueItem {
  id: number;
  payload: {
    operation: "INSERT" | "UPDATE" | "DELETE";
    table: string;
    schema: string;
    records: Place[];
  };
  attempt_count: number;
}

async function processQueue() {
  const batchSize = 100;
  let processedCount = 0;

  while (true) {
    const { data: items, error } = await supabase
      .from("algolia_sync_queue")
      .select("id, payload, attempt_count")
      .in("status", ["pending", "failed"])
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (error) throw new Error(`Failed to fetch queue items: ${error.message}`);
    if (!items || items.length === 0) break;

    for (const item of items as QueueItem[]) {
      try {
        await processItem(item);
        await markItemAsProcessed(item.id);
        processedCount++;
      } catch (error) {
        await handleProcessingError(item, error);
      }
    }
  }

  await cleanupProcessedItems();
  return processedCount;
}

async function processItem(item: QueueItem) {
  const { operation, records } = item.payload;

  switch (operation) {
    case "INSERT":
    case "UPDATE":
      await index.saveObjects(records.map((record) => ({
        objectID: record.id,
        ...record,
      })));
      break;
    case "DELETE":
      await index.deleteObjects(records.map((record) => record.id));
      break;
  }
}

async function markItemAsProcessed(itemId: number) {
  const { error } = await supabase
    .from("algolia_sync_queue")
    .update({ status: "processed", processed_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) {
    throw new Error(`Failed to mark item as processed: ${error.message}`);
  }
}

async function handleProcessingError(item: QueueItem, error: Error) {
  console.error(`Error processing item ${item.id}:`, error);
  const maxAttempts = 5;

  if (item.attempt_count >= maxAttempts) {
    const { error: updateError } = await supabase
      .from("algolia_sync_queue")
      .update({ status: "failed" })
      .eq("id", item.id);

    if (updateError) {
      throw new Error(`Failed to update item status: ${updateError.message}`);
    }
  } else {
    const { error: updateError } = await supabase
      .from("algolia_sync_queue")
      .update({
        attempt_count: item.attempt_count + 1,
        last_attempted_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (updateError) {
      throw new Error(
        `Failed to update item attempt count: ${updateError.message}`,
      );
    }
  }
}

async function cleanupProcessedItems() {
  const retentionPeriod = "7 days";
  const { error } = await supabase.rpc("cleanup_processed_items", {
    retention_period: retentionPeriod,
  });

  if (error) {
    throw new Error(`Failed to cleanup processed items: ${error.message}`);
  }
}

serve(async () => {
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
