<template>
    <PageWrapper title="小助手">
        <div class="ai-dialog">
            <div class="messages-container">
                <div class="message-item" v-for="(msg, index) in messages" :key="index">
                    <div class="ai-message" v-if="msg.role === 'assistant'">
                        <span class="ai-message-content">{{ msg.content || 'loading...' }}</span>
                    </div>
                    <div class="user-message" v-else>
                        <div class="user-message-content">{{ msg.content }}</div>
                    </div>
                </div>
            </div>
            <div class="input-area">
                <textarea v-model="userInput" class="text-area" placeholder="请输入您的问题..." maxlength="-1" auto-height />
                <div class="user-operation">
                    <span :class="{ 'send-button': true, disabled: !userInput.trim() }" @click="sendMessage">发送</span>
                </div>
            </div>
        </div>
    </PageWrapper>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { ws, type IMessage } from '@/utils/websocket';
import PageWrapper from '@/components/PageWrapper.vue';

const messages = ref<IMessage[]>([]);
const loading = ref(false);
const index = ref(0);
const userInput = ref('');

const sendMessage = async () => {
    const question = userInput.value.trim();
    if (!question || loading.value) return;

    userInput.value = '';
    loading.value = true;
    messages.value.push({ role: 'user', content: question });

    // 添加 AI 占位消息
    index.value = messages.value.length;
    messages.value.push({ role: 'assistant', content: '' });

    ws.send(question);
};
ws.on('message', (data) => {
    if (data === '[DONE]') {
        loading.value = false;
        return;
    }
    messages.value[index.value].content += data;
});

onMounted(() => {
    ws.init();
});
</script>

<style lang="scss" scoped>
.ai-dialog {
    @include flex('', '', column);
    row-gap: 12rpx;
    height: 100%;
    overflow: hidden;
    .messages-container {
        flex: 1;
        overflow-y: auto;
        .message-item {
            padding: 20rpx;
            .user-message {
                text-align: right;
                &-content {
                    display: inline-block;
                    max-width: 80%;
                    padding: 16rpx 20rpx;
                    background: #eff6ff;
                    color: #262626;
                    border-radius: 16rpx;
                }
            }
        }
    }
    .input-area {
        max-height: 320rpx;
        padding: 20rpx 20rpx 0;
        background: rgb(243, 244, 246);
        border-radius: 20rpx;
        .text-area {
            width: 100%;
            height: unset;
            min-height: 96rpx;
            max-height: 240rpx;
            line-height: 48rpx;
            border: none;
            resize: none;
            box-sizing: border-box;
        }
        .user-operation {
            height: 60rpx;
            line-height: 60rpx;
            text-align: right;
            .send-button {
                color: #1989fa;
                cursor: pointer;
                &.disabled {
                    color: rgba(0, 0, 0, 0.25);
                    pointer-events: none;
                }
            }
        }
    }
}
</style>
