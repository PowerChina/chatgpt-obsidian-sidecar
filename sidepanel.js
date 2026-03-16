function $(id){return document.getElementById(id)}

function simpleSummary(text){
  const lines = text.split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const first = lines.slice(0,3).join('；');
  const key = [];
  if(/需求|requirement/.test(text)) key.push('需求点明确');
  if(/风险|risk|问题/.test(text)) key.push('包含风险或问题');
  if(/方案|计划|实现/.test(text)) key.push('含方案/实现信息');
  return `摘要：${first || text.slice(0,120)}\n要点：${key.join('、') || '请人工补充要点'}`;
}

async function loadSelection(){
  const { latestSelection, latestSelectionAt, latestTabUrl } = await chrome.storage.local.get(['latestSelection','latestSelectionAt','latestTabUrl']);
  if(latestSelection) $('selection').value = latestSelection;
  $('meta').textContent = latestSelectionAt ? `来源：${latestTabUrl || '-'} | ${new Date(latestSelectionAt).toLocaleString()}` : '尚未捕获';
}

async function loadCfg(){
  const keys = ['vaultName','filePath','defaultTags','writeMode','llmEndpoint','llmApiKey','llmModel','obsidianRestBase','obsidianApiKey'];
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
    obsidianApiKey: $('obsidianApiKey').value.trim()
  });
  $('status').textContent = '配置已保存';
}

function buildPayload(){
  const tags = $('tags').value.trim();
  const selection = $('selection').value.trim();
  const summary = $('summary').value.trim();
  const note = $('note').value.trim();
  const now = new Date().toLocaleString();
  return `\n\n## ${now}\n${tags ? tags + '\n' : ''}\n### 原文\n${selection || '(空)'}\n\n### 总结\n${summary || '(空)'}\n\n### 备注\n${note || '(空)'}\n`;
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
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'text/markdown'
    },
    body: content
  });
  if(!res.ok){
    throw new Error(`REST写入失败: ${res.status} ${await res.text()}`);
  }
}

async function llmSummarize(text){
  const endpoint = $('llmEndpoint').value.trim() || 'https://api.openai.com/v1/chat/completions';
  const key = $('llmApiKey').value.trim();
  const model = $('llmModel').value.trim() || 'gpt-4o-mini';
  if(!key) throw new Error('未配置 LLM API Key');

  const prompt = `你是笔记助理。请把以下内容整理成：\n1) 三条要点\n2) 风险/疑问\n3) 下一步建议\n\n内容：\n${text}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一个精炼的中文总结助手。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    })
  });
  if(!res.ok) throw new Error(`LLM调用失败: ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || '';
}

$('quickSummaryBtn').addEventListener('click', ()=>{
  $('summary').value = simpleSummary($('selection').value.trim());
});

$('summarizeBtn').addEventListener('click', async ()=>{
  const text = $('selection').value.trim();
  if(!text){ $('status').textContent='没有可总结的文本'; return; }
  try {
    $('status').textContent = 'LLM 总结中...';
    const out = await llmSummarize(text);
    $('summary').value = out || simpleSummary(text);
    $('status').textContent = 'LLM 总结完成';
  } catch (e) {
    $('summary').value = simpleSummary(text);
    $('status').textContent = `LLM失败，已回退本地总结：${e.message}`;
  }
});

$('saveCfgBtn').addEventListener('click', saveCfg);

$('writeBtn').addEventListener('click', async ()=>{
  const vault = $('vault').value.trim();
  const file = $('file').value.trim();
  const mode = $('writeMode').value;
  if(!vault || !file){
    $('status').textContent = '请先填写 Vault 与目标文档路径';
    return;
  }
  await saveCfg();

  try {
    const content = buildPayload();
    if(mode === 'rest'){
      const base = $('obsidianRestBase').value.trim() || 'http://127.0.0.1:27124';
      const apiKey = $('obsidianApiKey').value.trim();
      if(!apiKey) throw new Error('缺少 Obsidian REST API Key');
      await writeByRest(base, apiKey, vault, file, content);
      $('status').textContent = '已通过 Local REST API 写入成功';
    } else {
      openObsidianAppend(vault, file, content);
      $('status').textContent = '已触发 URI 写入，请在 Obsidian 确认';
    }
  } catch (e) {
    $('status').textContent = `写入失败：${e.message}`;
  }
});

chrome.runtime.onMessage.addListener((msg)=>{
  if(msg?.type==='SELECTION_CAPTURED') loadSelection();
});

loadSelection();
loadCfg();
