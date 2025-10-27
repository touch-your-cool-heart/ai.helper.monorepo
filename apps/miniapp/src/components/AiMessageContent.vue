<template>
  <div class="ai-message-content">
    <!-- 在微信/小程序环境使用 rich-text nodes -->
    <rich-text v-if="isMiniProgram" :nodes="nodes" />
    <!-- web 环境回退为 html 渲染 -->
    <div v-else v-html="htmlContent"></div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue';

const props = defineProps<{ content?: string }>();

// 简单的运行时判定小程序环境（微信小程序中有全局 wx 对象）
const isMiniProgram = typeof (globalThis as any).wx !== 'undefined' && typeof (globalThis as any).wx.getSystemInfo === 'function';

const nodes = ref<any[]>([]);

// web 回退：安全的 html 文本（将换行转为 <br/>）
const htmlContent = computed(() => {
  const raw = props.content ?? 'loading...';
  return escapeHtml(raw).replace(/\r?\n/g, '<br/>');
});

watch(() => props.content, (v) => {
  nodes.value = parseMarkdownToNodes(v ?? '');
}, { immediate: true });

function parseMarkdownToNodes(md: string) {
  if (!md) return [{ name: 'div', children: [{ type: 'text', text: 'loading...' }] }];

  const lines = md.split(/\r?\n/);
  const result: any[] = [];
  let i = 0;
  let inCode = false;
  let codeBuf: string[] = [];
  let codeBlockOpenLine = -1;
  let listBuf: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const BLOCK_STYLE = 'white-space: pre-wrap; word-break: break-word; word-wrap: break-word; overflow-wrap: anywhere;';

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (!inCode) {
        inCode = true;
        codeBuf = [];
        codeBlockOpenLine = i;
        i++;
        continue;
      }
      // 结束 code block
      inCode = false;
      result.push({ name: 'pre', attrs: { style: BLOCK_STYLE }, children: [{ name: 'code', attrs: { style: BLOCK_STYLE }, children: [{ type: 'text', text: codeBuf.join('\n') }] }] });
      codeBlockOpenLine = -1;
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      // 如果到最后一行还没遇到结束符，则把当前 codeBuf 作为未闭合代码块渲染（流式场景）
      if (i === lines.length) {
        result.push({ name: 'pre', attrs: { style: BLOCK_STYLE }, children: [{ name: 'code', attrs: { style: BLOCK_STYLE }, children: [{ type: 'text', text: codeBuf.join('\n') }] }] });
        inCode = false;
        codeBlockOpenLine = -1;
      }
      continue;
    }

    const ulMatch = line.match(/^\s*[-*]\s+(.*)/);
    const olMatch = line.match(/^\s*\d+\.\s+(.*)/);
    if (ulMatch) {
      if (listType !== 'ul') { if (listBuf.length && listType) { result.push(listNodeFromBuf(listType, listBuf)); listBuf = []; } listType = 'ul'; }
      listBuf.push(ulMatch[1]); i++; continue;
    } else if (olMatch) {
      if (listType !== 'ol') { if (listBuf.length && listType) { result.push(listNodeFromBuf(listType, listBuf)); listBuf = []; } listType = 'ol'; }
      listBuf.push(olMatch[1]); i++; continue;
    } else {
      if (listBuf.length) { result.push(listNodeFromBuf(listType!, listBuf)); listBuf = []; listType = null; }
    }

    const hMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (hMatch) {
      const level = hMatch[1].length;
      result.push({ name: 'h' + level, attrs: { style: BLOCK_STYLE }, children: inlineParse(hMatch[2]) });
      i++; continue;
    }

    if (line.trim() === '') { i++; continue; }

    // accumulate paragraph until empty line
    let para = line;
    let j = i + 1;
    while (j < lines.length && lines[j].trim() !== '') { para += '\n' + lines[j]; j++; }
    result.push({ name: 'p', attrs: { style: BLOCK_STYLE }, children: inlineParse(para) });
    i = j;
  }

  if (listBuf.length) result.push(listNodeFromBuf(listType!, listBuf));
  return result;
}

function listNodeFromBuf(type: 'ul' | 'ol', buf: string[]) {
  const BLOCK_STYLE = 'white-space: pre-wrap; word-break: break-word; word-wrap: break-word; overflow-wrap: anywhere;';
  return { name: type, attrs: { style: BLOCK_STYLE }, children: buf.map(item => ({ name: 'li', attrs: { style: BLOCK_STYLE }, children: inlineParse(item) })) };
}

function inlineParse(text: string) {
  const nodes: any[] = [];
  let rest = text;
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/;
  while (rest.length > 0) {
    const m = rest.match(pattern);
    if (!m) { nodes.push({ type: 'text', text: rest }); break; }
    const index = m.index!;
    if (index > 0) nodes.push({ type: 'text', text: rest.slice(0, index) });
    const token = m[0];
    if (token.startsWith('**')) {
      const inner = token.slice(2, -2);
      nodes.push({ name: 'strong', children: [{ type: 'text', text: inner }] });
    } else if (token.startsWith('*')) {
      const inner = token.slice(1, -1);
      nodes.push({ name: 'em', children: [{ type: 'text', text: inner }] });
    } else if (token.startsWith('`')) {
      const inner = m[4] || '';
      nodes.push({ name: 'code', children: [{ type: 'text', text: inner }] });
    } else if (token.startsWith('[')) {
      const textLabel = m[5] || '';
      const href = m[6] || '';
      nodes.push({ name: 'a', attrs: { href }, children: [{ type: 'text', text: textLabel }] });
    }
    rest = rest.slice(index + token.length);
  }
  return nodes;
}

function escapeHtml(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
</script>

<style scoped>
.ai-message-content {
  display: inline-block;
  max-width: 100%;
  padding: 16rpx 20rpx;
  background: #eff6ff;
  color: #262626;
  border-radius: 16rpx;
}

/* 代码块样式（小程序受限，具体样式按平台微调） */
pre { background:#f6f8fa; padding:12rpx; border-radius:8rpx; }
code { font-family: monospace; }
</style>
