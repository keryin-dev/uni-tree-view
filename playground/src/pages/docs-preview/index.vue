<template>
  <app-page>
    <view class="docs-preview-page">
      <view class="docs-preview-header">
        <view class="docs-preview-header__brand">
          <image
            class="docs-preview-header__logo"
            src="/static/uni-tree-view-logo.png"
            mode="aspectFit"></image>
          <view class="docs-preview-header__copy">
            <view class="docs-preview-header__title">
              Uni Tree View
            </view>
            <view class="docs-preview-header__description">
              互动案例台
            </view>
          </view>
        </view>
        <view class="docs-preview-header__live">
          <view class="docs-preview-header__live-dot"></view>
          LIVE
        </view>
      </view>

      <scroll-view class="docs-preview-content" scroll-y :show-scrollbar="false">
        <view :key="scene" class="docs-preview-scene">
          <view class="docs-preview-intro">
            <view class="docs-preview-intro__topline">
              <text class="docs-preview-intro__eyebrow">
                {{ currentMeta.eyebrow }}
              </text>
              <text class="docs-preview-intro__index">
                {{ currentMeta.index }} / 06
              </text>
            </view>
            <view class="docs-preview-intro__title">
              {{ currentMeta.title }}
            </view>
            <view class="docs-preview-intro__description">
              {{ currentMeta.description }}
            </view>
            <view class="docs-preview-intro__tags">
              <text v-for="tag in currentMeta.tags" :key="tag" class="docs-preview-intro__tag">
                {{ tag }}
              </text>
            </view>
          </view>

          <basic-demo v-if="scene === 'basic'"></basic-demo>
          <selection-demo v-else-if="scene === 'selection'"></selection-demo>
          <filter-demo v-else-if="scene === 'filter'"></filter-demo>
          <lazy-load-demo v-else-if="scene === 'lazy-load'"></lazy-load-demo>
          <virtual-demo v-else-if="scene === 'virtual'"></virtual-demo>
          <slots-demo v-else></slots-demo>
        </view>
      </scroll-view>
    </view>
  </app-page>
</template>

<script setup lang="ts">
import { onLoad } from "@dcloudio/uni-app";
import { computed, shallowRef } from "vue";
import AppPage from "@/components/appPage/index.vue";
import BasicDemo from "@/components/docs-demos/BasicDemo.vue";
import FilterDemo from "@/components/docs-demos/FilterDemo.vue";
import LazyLoadDemo from "@/components/docs-demos/LazyLoadDemo.vue";
import type { DemoScene } from "@/components/docs-demos/scenes";
import { demoSceneMeta, isDemoScene } from "@/components/docs-demos/scenes";
import SelectionDemo from "@/components/docs-demos/SelectionDemo.vue";
import SlotsDemo from "@/components/docs-demos/SlotsDemo.vue";
import VirtualDemo from "@/components/docs-demos/VirtualDemo.vue";

/* 场景不再有页内切换入口：由文档左侧示例菜单驱动，
   每个示例页通过 iframe query 传入唯一 scene */
const scene = shallowRef<DemoScene>("basic");
const currentMeta = computed(() => demoSceneMeta[scene.value]);

onLoad((options) => {
  if (isDemoScene(options?.scene)) {
    scene.value = options.scene;
  }
});
</script>

<style lang="scss">
.docs-preview-page {
  box-sizing: border-box;
  height: 100vh;
  overflow: hidden;
  color: #16241c;
  font-family: var(--font-global);
  background: #f5f8f6;
}

.docs-preview-header {
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 13px;
  background: #fbfdfc;
  border-bottom: 1px solid rgba(22, 52, 37, 0.08);
}

.docs-preview-header__brand {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.docs-preview-header__logo {
  display: block;
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
}

.docs-preview-header__copy {
  min-width: 0;
}

.docs-preview-header__title {
  overflow: hidden;
  color: #16241c;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.1px;
  line-height: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.docs-preview-header__description {
  margin-top: 2px;
  color: #82908a;
  font-size: 10px;
  line-height: 12px;
  letter-spacing: 1px;
}

.docs-preview-header__live {
  display: flex;
  flex: 0 0 auto;
  gap: 5px;
  align-items: center;
  padding: 4px 7px;
  color: #1f7850;
  font-family: var(--font-mono-global);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  background: transparent;
  border: 1px solid rgba(41, 151, 100, 0.32);
  border-radius: 500px;
}

.docs-preview-header__live-dot {
  width: 4px;
  height: 4px;
  background: #2ca76c;
  border-radius: 50%;
  animation: DocsLivePulse 2.4s ease-in-out infinite;
}

.docs-preview-content {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  height: calc(100vh - 52px);
}

.docs-preview-scene {
  padding: 11px 11px 23px;
  animation: DocsSceneEnter 0.28s ease both;
}

/* 场景卡：墨绿平色，信息按"眉题/序号 → 标题 → 说明 → 标签"分层，
   不做渐变与装饰图形，靠层次与留白立住 */
.docs-preview-intro {
  padding: 13px 13px 12px;
  color: #fff;
  background: #142e21;
  border-radius: 9px;
}

.docs-preview-intro__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.docs-preview-intro__eyebrow,
.docs-preview-intro__index {
  color: #7fbf9d;
  font-family: var(--font-mono-global);
  font-size: 10px;
  font-weight: 600;
  line-height: 12px;
  letter-spacing: 1px;
}

.docs-preview-intro__index {
  color: rgba(255, 255, 255, 0.4);
  font-variant-numeric: tabular-nums;
}

.docs-preview-intro__title {
  margin-top: 6px;
  font-size: 17px;
  font-weight: 750;
  line-height: 22px;
  letter-spacing: -0.2px;
}

.docs-preview-intro__description {
  max-width: 92%;
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.68);
  font-size: 10px;
  line-height: 16px;
}

.docs-preview-intro__tags {
  display: flex;
  gap: 5px;
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.docs-preview-intro__tag {
  padding: 2px 6px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 10px;
  line-height: 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 4px;
}

@keyframes DocsSceneEnter {
  0% {
    opacity: 0;
    transform: translateY(4px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes DocsLivePulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(44, 167, 108, 0.32);
  }

  50% {
    box-shadow: 0 0 0 3px rgba(44, 167, 108, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .docs-preview-scene {
    animation: none;
  }

  .docs-preview-header__live-dot {
    animation: none;
  }
}
</style>