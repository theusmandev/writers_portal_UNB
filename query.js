import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eeihfopzeohgezhftzri.supabase.co';
const supabaseKey = 'sb_publishable_weD9lN3DJ6UVBcMkN8H7fw_TxMrpdZY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, novel_title, current_status, novel_status, current_stage')
    .eq('novel_status', 'Ongoing')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Result:', JSON.stringify(data, null, 2));
}

main();
