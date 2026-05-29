// ========================================
// Supabase Configuration
// ========================================

var SUPABASE_URL = "https://dzsnjyxysxuvtsnfkxaf.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c25qeXh5c3h1dnRzbmZreGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzE3OTAsImV4cCI6MjA5NTY0Nzc5MH0.fFYbkP00gShdAIBuiBtOmsAlWzXLBX2w4o_y-Nf16KQ";

var supabaseClient;

try {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.warn("Supabase not configured yet — running in demo mode.");
}

// --- Database helpers ---

function getLetters() {
  return supabaseClient.from("letters")
    .select("*")
    .order("created_at", { ascending: true })
    .then(function (result) {
      if (result.error) throw result.error;
      return (result.data || []).map(function (row) {
        return {
          id: row.id,
          name: row.name,
          relationship: row.relationship,
          message: row.message,
          songTitle: row.song_title,
          songArtist: row.song_artist,
          songUrl: row.song_url || "",
          photoUrls: Array.isArray(row.photo_urls) ? row.photo_urls : (row.photo_url ? [row.photo_url] : []),
          audioUrl: row.audio_url || "",
          createdAt: row.created_at
        };
      });
    });
}

function addLetter(data) {
  return supabaseClient.from("letters")
    .insert([{
      name: data.name,
      relationship: data.relationship,
      message: data.message,
      song_title: data.songTitle,
      song_artist: data.songArtist,
      song_url: data.songUrl || "",
      photo_urls: data.photoUrls || [],
      audio_url: data.audioUrl || ""
    }])
    .select()
    .single()
    .then(function (result) {
      if (result.error) throw result.error;
      return result.data;
    });
}

function getLetterCount() {
  return supabaseClient.from("letters")
    .select("*", { count: "exact", head: true })
    .then(function (result) {
      if (result.error) throw result.error;
      return result.count || 0;
    });
}

// --- Storage helpers ---

function uploadPhoto(file, fileName) {
  return supabaseClient.storage
    .from("photos")
    .upload(fileName, file, { cacheControl: "3600", upsert: false })
    .then(function (result) {
      if (result.error) throw result.error;
      var publicUrl = supabaseClient.storage
        .from("photos")
        .getPublicUrl(result.data.path).data.publicUrl;
      return publicUrl;
    });
}

// --- Audio upload ---

function uploadAudio(file, fileName) {
  return supabaseClient.storage
    .from("audio")
    .upload(fileName, file, { cacheControl: "3600", upsert: false })
    .then(function (result) {
      if (result.error) throw result.error;
      var publicUrl = supabaseClient.storage
        .from("audio")
        .getPublicUrl(result.data.path).data.publicUrl;
      return publicUrl;
    });
}

// --- SQL to run in Supabase SQL Editor after creating project ---
/*
CREATE TABLE letters (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  message TEXT NOT NULL,
  song_title TEXT NOT NULL,
  song_artist TEXT NOT NULL,
  song_url TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage: create a bucket named "photos" and make it public
*/
