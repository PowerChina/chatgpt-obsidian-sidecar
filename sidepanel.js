function $(id){return document.getElementById(id)}

function simpleSummary(text){
  const lines = text.split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const first = lines.slice(0,3).join('；');
  const key = [];
  if(/需求|requirement|需求/.test(text)) key.push('需求点明确');
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
  const { vaultName, filePath, defaultTags } = await chrome.storage.local.get(['vaultName','filePath','defaultTags']);
  if(vaultName) $('vault').value = vaultName;
  if(filePath) $('file').value = filePath;
  if(defaultTags) $('tags').value = defaultTags;
}

async function saveCfg(){
  await chrome.storage.local.set({
    vaultName: $('vault').value.trim(),
    filePath: $('file').value.trim(),
    defaultTags: $('tags').value.trim()
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
  const params = new URLSearchParams({
    vault,
    filepath: file,
    mode: 'append',
    data: content
  });
  const url = `obsidian://advanced-uri?${params.toString()}`;
  chrome.tabs.create({ url });
}

$('summarizeBtn').addEventListener('click', ()=>{
  $('summary').value = simpleSummary($('selection').value.trim());
});

$('saveCfgBtn').addEventListener('click', saveCfg);

$('writeBtn').addEventListener('click', async ()=>{
  const vault = $('vault').value.trim();
  const file = $('file').value.trim();
  if(!vault || !file){
    $('status').textContent = '请先填写 Vault 与目标文档路径';
    return;
  }
  await saveCfg();
  openObsidianAppend(vault, file, buildPayload());
  $('status').textContent = '已触发写入，请在 Obsidian 确认';
});

chrome.runtime.onMessage.addListener((msg)=>{
  if(msg?.type==='SELECTION_CAPTURED') loadSelection();
});

loadSelection();
loadCfg();
