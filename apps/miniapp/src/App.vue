<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
import { useSystemStore } from './pinia/system';

const systemStore = useSystemStore();

onLaunch(() => {
    console.log('App Launch');
    systemStore.setSystemInfo();
});
onShow(() => {
    console.log('App Show');
});
onHide(() => {
    console.log('App Hide');
});
</script>

<style lang="scss">
page {
    overflow: hidden;
}
view {
    box-sizing: border-box;
}
</style>
