
type MessageCallback = (data: any) => void;
type EventType = 'open' | 'message' | 'close' | 'error';
type TRole = 'system' | 'user' | 'assistant';

export interface IMessage {
    role: TRole;
    content: string;
}

class WebSocketManager {
    private socketTask: UniApp.SocketTask | null = null;
    private eventListeners: Record<EventType, MessageCallback[]> = {
        open: [],
        message: [],
        close: [],
        error: []
    };
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;
    private reconnectInterval = 2000; // 重连间隔(ms)
    private url: string;
    private sessionId = '';

    constructor(url: string) {
        this.url = url;
    }

    /**
     * 连接 WebSocket
     */
    init(): void {
        if (this.socketTask) {
            console.warn('WebSocket 已连接，无需重复连接');
            return;
        }

        this.socketTask = uni.connectSocket({
            url: this.url,
            success: () => {
                console.log('WebSocket 连接成功');
            },
            fail: (err) => {
                console.error('WebSocket 连接失败', err);
            }
        });

        this.bindEvents();
    }

    /**
     * 绑定事件监听
     */
    private bindEvents(): void {
        if (!this.socketTask) return;

        this.socketTask.onOpen(() => {
            this.reconnectAttempts = 0; // 重置重连计数器
            this.emit('open', null);
        });

        this.socketTask.onMessage((res) => {
            const data = typeof res.data === 'string' ? res.data : '';
            this.emit('message', data);
        });

        this.socketTask.onClose(() => {
            this.emit('close', null);
            this.tryReconnect();
        });

        this.socketTask.onError((err) => {
            console.error('WebSocket 错误:', err);
            this.emit('error', err);
            this.tryReconnect();
        });
    }

    /**
     * 尝试重新连接
     */
    private tryReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                console.log(`尝试第 ${this.reconnectAttempts} 次重连...`);
                this.init();
            }, this.reconnectInterval);
        } else {
            console.warn(`已达到最大重连次数 ${this.maxReconnectAttempts}`);
        }
    }

    /**
     * 发送消息
     */
    send(data: string | IMessage): void {
        if (!this.socketTask) {
            return console.error('WebSocket 未连接');
        }
        if (!this.sessionId) {
            this.sessionId = `${Date.now()}`;
        }
        const messages: IMessage[] = typeof data === 'string' ? [{ role: 'user', content: data }] : [data];
        this.socketTask.send({
            data: JSON.stringify({ conversationId: this.sessionId, messages }),
            fail: (err) => {
                console.error('消息发送失败:', err);
            }
        });
    }

    /**
     * 关闭连接
     */
    close(): void {
        if (this.socketTask) {
            this.socketTask.close({ reason: '未知原因' });
            this.socketTask = null;
        }
    }

    /**
     * 添加事件监听
     */
    on(event: EventType, callback: MessageCallback): void {
        this.eventListeners[event].push(callback);
    }

    /**
     * 移除事件监听
     */
    off(event: EventType, callback?: MessageCallback): void {
        if (!callback) {
            this.eventListeners[event] = [];
        } else {
            this.eventListeners[event] = this.eventListeners[event].filter((cb) => cb !== callback);
        }
    }

    /**
     * 触发事件
     */
    private emit(event: EventType, data: any): void {
        this.eventListeners[event].forEach((callback) => {
            try {
                callback(data);
            } catch (e) {
                console.error(`事件 ${event} 回调执行失败:`, e);
            }
        });
    }

    /**
     * 获取连接状态
     */
    get isConnected(): boolean {
        return !!this.socketTask;
    }
}

// 单例模式导出
export const ws = new WebSocketManager('ws://localhost:10087');
