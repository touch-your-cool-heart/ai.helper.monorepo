import { defineStore } from 'pinia';

interface ISystemState {
    statusBarHeight: number
    navbarHeight: number;
    menuStatusBarDist: number;
    menuHeight: number
}

export const useSystemStore = defineStore('system', {
    state(): ISystemState {
        return {
            statusBarHeight: 0,
            navbarHeight: 0,
            menuStatusBarDist: 0,
            menuHeight: 0
        };
    },
    actions: {
        setSystemInfo() {
            const systemInfo = uni.getSystemInfoSync();
            const { statusBarHeight = 0 } = systemInfo;
            this.statusBarHeight = systemInfo.statusBarHeight || 0
            // #ifdef MP-WEIXIN
            const menuInfo = uni.getMenuButtonBoundingClientRect();
            this.menuHeight = menuInfo.height
            this.menuStatusBarDist = menuInfo.top - this.statusBarHeight;
            this.navbarHeight = this.menuStatusBarDist * 2 + statusBarHeight + menuInfo.height;
            // #endif
        }
    }
});
