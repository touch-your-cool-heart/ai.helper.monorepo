<template>
    <PageWrapper title="个人中心" showBackIcon :customedBack="handleBack">user</PageWrapper>
</template>

<script lang="ts" setup>
import { EPagePath } from '@/utils/navigator';
import PageWrapper from '@/components/PageWrapper.vue';

const handleBack = () => {
    uni.switchTab({ url: EPagePath.HOME });
};
</script>

<style lang="scss" scoped></style>
