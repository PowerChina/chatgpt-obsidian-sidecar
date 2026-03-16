function $(id){return document.getElementById(id)}

const HASH_KEY='queueHashes';
const QUEUE_KEY='snippetQueue';

function simpleSummary(text){
  const lines = text.split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const first = lines.slice(0,3).join('；');
  const key = [];
  if(/需求|requirement/.test(text)) key.push('需求点明确');
  if(/风险|risk|问题/.test(text)) key.push('包含风险或问题');
  if(/方案|计划|实现/.test(text)) key.push('含方案/实现信息');
  return `摘要：${first || text.slice(0,120)}\n要点：${key.join('、') || '请人工补充要点'}`;
}

async function sha256(text){
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  return Array.from(new Uint8Array(hashBuffer)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

function parseRules(raw){
  return raw.split('\n').map(s=>s.trim()).filter(Boolean).map(line=>{
    const [tag, file] = line.split('=>').map(v=>v?.trim());
    return {tag, file};
  }).filter(x=>x.tag&&x.file);
}

function decideFileByTags(defaultFile,tags,routeRules){
  const rules=parseRules(routeRules||'');
  const tagList=(tags||'').split(/\s+/).filter(Boolean);
  for(const t of tagList){
    const hit=rules.find(r=>r.tag===t);
    if(hit) return hit.file;
  }
  return defaultFile;
}

async function loadSelection(){
  const { latestSelection, latestSelectionAt, latestTabUrl } = await chrome.storage.local.get(['latestSelection','latestSelectionAt','latestTabUrl']);
  if(latestSelection) $('selection').value = latestSelection;
  $('meta').textContent = latestSelectionAt ? `来源：${latestTabUrl || '-'} | ${new Date(latestSelectionAt).toLocaleString()}` : '尚未捕获';
}

async function loadCfg(){
  const keys = ['vaultName','filePath','defaultTags','writeMode','llmEndpoint','llmApiKey','llmModel','obsidianRestBase','obsidianApiKey','routeRules'];
  const cfg = await chrome.storage.local.get(keys);
  $('vault').value = cfg.vaultName || '';
  $('file').value = cfg.filePath || '';
  $('tags').value = cfg.defaultTags || '';
  $('writeMode').value = cfg.writeMode || 'rest';
  $('llmEndpoint').value = cfg.llmEndpoint || 'https://api.openai.com/v1/chat/completions';
  $('llmApiKey').value = cfg.llmApiKey || '';
  $('llmModel').value = cfg.llmModel || 'gpt-4o-mini';
  $('obsidianRestBase').value = cfg.obsidianRestBase || 'http://127.0.0.1:27124';
  $('obsidianApiKey').value = cfg.obsidianApiKey || '';
  $('routeRules').value = cfg.routeRules || '';
}

async function saveCfg(){
  await chrome.storage.local.set({
    vaultName: $('vault').value.trim(),
    filePath: $('file').value.trim(),
    defaultTags: $('tags').value.trim(),
    writeMode: $('writeMode').value,
    llmEndpoint: $('llmEndpoint').value.trim(),
    llmApiKey: $('llmApiKey').value.trim(),
    llmModel: $('llmModel').value.trim() || 'gpt-4o-mini',
    obsidianRestBase: $('obsidianRestBase').value.trim() || 'http://127.0.0.1:27124',
    obsidianApiKey: $('obsidianApiKey').value.trim(),
    routeRules: $('routeRules').value.trim()
  });
  $('status').textContent = '配置已保存';
}

function buildPayload(item){
  const now = item.time || new Date().toLocaleString();
  return `\n\n## ${now}\n${item.tags ? item.tags + '\n' : ''}\n### 原文\n${item.selection || '(空)'}\n\n### 总结\n${item.summary || '(空)'}\n\n### 备注\n${item.note || '(空)'}\n`;
}

function openObsidianAppend(vault, file, content){
  const params = new URLSearchParams({ vault, filepath: file, mode: 'append', data: content });
  chrome.tabs.create({ url: `obsidian://advanced-uri?${params.toString()}` });
}

async function writeByRest(base, apiKey, vault, file, content){
  const encodedPath = file.split('/').map(encodeURIComponent).join('/');
  const url = `${base.replace(/\/$/,'')}/vault/${encodeURIComponent(vault)}/${encodedPath}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {'Authorization': `Bearer ${apiKey}`,'Content-Type': 'text/markdown'},
    body: content
  });
  if(!res.ok) throw new Error(`REST写入失败: ${res.status}`);
}

async function llmSummarize(text){
  const endpoint = $('llmEndpoint').value.trim() || 'https://api.openai.com/v1/chat/completions';
  const key = $('llmApiKey').value.trim();
  const model = $('llmModel').value.trim() || 'gpt-4o-mini';
  if(!key) throw new Error('未配置 LLM API Key');
  const prompt = `请把以下内容整理成：\n1) 三条要点\n2) 风险/疑问\n3) 下一步建议\n\n内容：\n${text}`;
  const res = await fetch(endpoint,{method:'POST',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:'你是精炼中文总结助手。'},{role:'user',content:prompt}],temperature:0.2})});
  if(!res.ok) throw new Error(`LLM调用失败: ${res.status}`);
  const data=await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || '';
}

async function getQueue(){
  const { [QUEUE_KEY]:q=[] } = await chrome.storage.local.get([QUEUE_KEY]);
  return q;
}
async function setQueue(q){ await chrome.storage.local.set({ [QUEUE_KEY]: q }); }
async function getHashes(){ const { [HASH_KEY]:h={} } = await chrome.storage.local.get([HASH_KEY]); return h; }
async function setHashes(h){ await chrome.storage.local.set({ [HASH_KEY]: h }); }

async function enqueueCurrent(){
  const selection=$('selection').value.trim();
  if(!selection){$('status').textContent='没有可入队的文本';return;}
  const item={selection,tags:$('tags').value.trim(),summary:$('summary').value.trim(),note:$('note').value.trim(),time:new Date().toLocaleString()};
  const hash=await sha256(`${item.selection}||${item.tags}`);
  const hashes=await getHashes();
  if(hashes[hash]){ $('status').textContent='重复片段，已拦截'; return; }
  const q=await getQueue();
  q.push({...item,hash}); hashes[hash]=1;
  await setQueue(q); await setHashes(hashes);
  $('status').textContent='已加入队列';
  renderQueue();
}

async function clearQueue(){
  await setQueue([]); await setHashes({}); renderQueue(); $('status').textContent='队列已清空';
}

async function renderQueue(){
  const q=await getQueue();
  $('queueMeta').textContent=`队列 ${q.length} 条`;
  $('queueList').innerHTML=q.slice(-8).map((x,i)=>`<li>[${q.length-8+i+1>0?q.length-8+i+1:i+1}] ${x.tags||'(无标签)'} ${x.selection.slice(0,30)}...</li>`).join('');
}

async function writeOne(item,mode,vault,file){
  const targetFile=decideFileByTags(file,item.tags,$('routeRules').value.trim());
  const content=buildPayload(item);
  if(mode==='rest'){
    const base=$('obsidianRestBase').value.trim()||'http://127.0.0.1:27124';
    const apiKey=$('obsidianApiKey').value.trim();
    if(!apiKey) throw new Error('缺少 Obsidian REST API Key');
    await writeByRest(base,apiKey,vault,targetFile,content);
  }else{
    openObsidianAppend(vault,targetFile,content);
  }
}

$('tagTemplate').addEventListener('change',()=>{
  if($('tagTemplate').value) $('tags').value=$('tagTemplate').value;
});
$('quickSummaryBtn').addEventListener('click',()=>{$('summary').value=simpleSummary($('selection').value.trim());});
$('summarizeBtn').addEventListener('click',async()=>{
  const text=$('selection').value.trim(); if(!text) return;
  try{ $('status').textContent='LLM总结中...'; $('summary').value=await llmSummarize(text); $('status').textContent='LLM总结完成'; }
  catch(e){ $('summary').value=simpleSummary(text); $('status').textContent=`LLM失败，已回退：${e.message}`; }
});
$('enqueueBtn').addEventListener('click',enqueueCurrent);
$('clearQueueBtn').addEventListener('click',clearQueue);
$('saveCfgBtn').addEventListener('click',saveCfg);

$('writeBtn').addEventListener('click',async()=>{
  const vault=$('vault').value.trim(), file=$('file').value.trim(), mode=$('writeMode').value;
  if(!vault||!file){$('status').textContent='请先填写 Vault 与目标文档路径';return;}
  await saveCfg();
  try{ await writeOne({selection:$('selection').value.trim(),tags:$('tags').value.trim(),summary:$('summary').value.trim(),note:$('note').value.trim(),time:new Date().toLocaleString()},mode,vault,file); $('status').textContent='写入成功'; }
  catch(e){ $('status').textContent=`写入失败：${e.message}`; }
});

$('writeQueueBtn').addEventListener('click',async()=>{
  const vault=$('vault').value.trim(), file=$('file').value.trim(), mode=$('writeMode').value;
  if(!vault||!file){$('status').textContent='请先填写 Vault 与目标文档路径';return;}
  const q=await getQueue(); if(!q.length){$('status').textContent='队列为空'; return;}
  await saveCfg();
  try{
    for(const item of q) await writeOne(item,mode,vault,file);
    await clearQueue();
    $('status').textContent='批量写入成功（已防重复）';
  }catch(e){ $('status').textContent=`批量写入失败：${e.message}`; }
});

chrome.runtime.onMessage.addListener((msg)=>{ if(msg?.type==='SELECTION_CAPTURED') loadSelection(); });

loadSelection(); loadCfg(); renderQueue();
