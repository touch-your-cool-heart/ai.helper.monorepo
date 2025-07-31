import { WebSocketServer } from 'ws';
import fetch from 'node-fetch';
import { API_URL, ARK_API_KEY, PORT, ModelId } from './config';

type TRole = 'system' | 'user' | 'assistant';

interface IMessage {
    role: TRole;
    content: string;
}

interface IStreamResponse {
    choices: Array<{
        delta: IMessage;
        index: number;
    }>;
    created: number;
    id: string;
    model: string;
    service_tier: string;
    object: string;
    usage: null;
}

// 存储对话历史的映射表，key为流式响应返回的ID
const conversationHistory = new Map<string, IMessage[]>();

const wss = new WebSocketServer({ port: PORT });

console.log(`✅ WebSocket SSE 代理服务已启动：ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
    console.log('新客户端已连接');

    ws.on('message', async (data) => {
        let currentId: string;
        let messages: IMessage[];
        try {
            const parsed = JSON.parse(data.toString());
            messages = parsed.messages;
            currentId = parsed.conversationId;
        } catch (e) {
            console.warn('❌ WebSocket 消息解析失败:', data);
            ws.send('❌ 消息格式错误');
            return;
        }

        // 验证数据格式
        if (!currentId || typeof currentId !== 'string' || !Array.isArray(messages)) {
            ws.send('❌ 消息格式应为 { conversationId: string; messages: IMessage[] }');
            return;
        }

        // 使用客户端提供的ID获取历史
        const existingHistory = conversationHistory.get(currentId) || [];
        const payload = {
            model: ModelId,
            stream: true,
            thinking: { type: 'disabled' },
            messages: [...existingHistory, ...messages]
        };
        // console.log(JSON.stringify(payload.messages))

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${ARK_API_KEY}`,
                    Accept: 'text/event-stream'
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            let [buffer, currentReply] = ['', ''];
            response.body.on('data', (chunk: Buffer) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    const dataLines = line.split('\n');
                    for (const dataLine of dataLines) {
                        if (dataLine.startsWith('data: ')) {
                            const data = dataLine.slice(6).trim();
                            if (data === '[DONE]') {
                                // 流式响应结束，保存完整对话历史
                                if (currentReply && currentId) {
                                    const updatedHistory: IMessage[] = [
                                        ...existingHistory,
                                        ...messages,
                                        {
                                            role: 'assistant',
                                            content: currentReply
                                        }
                                    ];
                                    conversationHistory.set(currentId, updatedHistory);
                                }
                                ws.send('[DONE]');
                                return;
                            }

                            try {
                                const parsed: IStreamResponse = JSON.parse(data);
                                const content = parsed.choices[0].delta.content || '';
                                if (content) {
                                    currentReply += content;
                                    ws.send(content);
                                }
                            } catch (err) {
                                console.warn('❌ JSON解析失败:', data);
                            }
                        }
                    }
                }
            });

            response.body.on('error', (err) => {
                console.error('Stream error:', err);
                ws.send('❌ 流式响应错误: ' + (err as any).message);
            });
        } catch (err) {
            console.error('SSE请求失败:', err);
            ws.send('❌ 出错：' + (err as any).message);
        }
    });

    ws.on('close', () => {
        console.log('客户端已断开连接');
    });

    ws.on('error', (err) => {
        console.error('WebSocket错误:', err);
    });
});
