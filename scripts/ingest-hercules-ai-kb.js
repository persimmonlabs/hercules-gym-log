const fs = require('fs/promises');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const KB_DIR = path.join(__dirname, '..', 'docs', 'hercules-ai');
const DEFAULT_CHUNK_SIZE = 900;

const getEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const resolveSupabaseConfig = () => {
  const url = process.env.HERCULES_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey =
    process.env.HERCULES_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Missing HERCULES_SUPABASE_URL or SUPABASE_URL');
  }

  if (!serviceKey) {
    throw new Error('Missing HERCULES_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY');
  }

  return { url, serviceKey };
};

const chunkText = (text, maxLength = DEFAULT_CHUNK_SIZE) => {
  const paragraphs = text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  const chunks = [];
  let current = '';

  paragraphs.forEach((paragraph) => {
    if (!current) {
      current = paragraph;
      return;
    }

    if (current.length + paragraph.length + 2 <= maxLength) {
      current = `${current}\n\n${paragraph}`;
      return;
    }

    chunks.push(current);
    current = paragraph;
  });

  if (current) {
    chunks.push(current);
  }

  return chunks;
};

const ingestFile = async (supabase, filePath) => {
  const relativePath = path.relative(KB_DIR, filePath).replace(/\\/g, '/');
  const raw = await fs.readFile(filePath, 'utf8');
  const chunks = chunkText(raw);

  await supabase.from('ai_kb_docs').delete().eq('source', relativePath);

  const rows = chunks.map((chunk, index) => ({
    source: relativePath,
    chunk_index: index,
    content: chunk,
    metadata: {
      path: relativePath,
      length: chunk.length,
    },
  }));

  const { error } = await supabase.from('ai_kb_docs').insert(rows);
  if (error) {
    throw new Error(`Failed to insert KB docs for ${relativePath}: ${error.message}`);
  }

  console.log(`Inserted ${rows.length} chunks for ${relativePath}`);
};

const listMarkdownFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
};

const main = async () => {
  const { url, serviceKey } = resolveSupabaseConfig();
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const files = await listMarkdownFiles(KB_DIR);
  if (files.length === 0) {
    throw new Error('No markdown files found to ingest.');
  }

  for (const filePath of files) {
    await ingestFile(supabase, filePath);
  }

  console.log('Hercules AI KB ingestion complete.');
};

main().catch((error) => {
  console.error('[KB Ingest] Failed:', error.message);
  process.exit(1);
});
