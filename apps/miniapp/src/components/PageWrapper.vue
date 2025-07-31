<template>
    <div class="page-wrapper">
        <div class="navbar" :style="navbarStyle">
            <!-- #ifdef MP-WEIXIN -->
            <image v-if="showBackIcon" class="back-icon" @click="handleBack" src="../static//back_arrow.png" alt="" />
            <div class="title">{{ title }}</div>
            <!-- #endif -->
        </div>
        <div class="page-wrapper-content" :style="contentStyle">
            <slot></slot>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, StyleValue } from 'vue';
import { useSystemStore } from '@/pinia/system';

const props = defineProps<{
    title?: string;
    showBackIcon?: boolean;
    customedBack?: () => any;
}>();
const systemStore = useSystemStore();

const navbarStyle = computed<StyleValue>(() => {
    const { menuHeight, statusBarHeight, menuStatusBarDist } = systemStore;
    return {
        height: `${menuHeight}px`,
        top: `${statusBarHeight + menuStatusBarDist}px`
    };
});
const contentStyle = computed<StyleValue>(() => {
    const { menuHeight, statusBarHeight, menuStatusBarDist } = systemStore;
    const marginTop = statusBarHeight + menuHeight + menuStatusBarDist * 2;
    return {
        height: `calc(100% - ${marginTop}px)`,
        marginTop: `${marginTop}px`
    };
});

const handleBack = () => {
    if (props.customedBack) {
        return props.customedBack();
    }
    uni.navigateBack();
};
</script>

<style lang="scss" scoped>
.page-wrapper {
    height: 100vh;
    padding: 0 24rpx;
    .navbar {
        @include flex(center, center);
        position: fixed;
        width: 100%;
        left: 0;
        .back-icon {
            position: absolute;
            left: 24rpx;
            width: 32rpx;
            height: 32rpx;
        }
        .title {
            font-weight: 600;
            white-space: nowrap;
        }
    }
    &-content {
        overflow-y: auto;
    }
}
</style>
