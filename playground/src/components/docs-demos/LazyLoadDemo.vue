<template>
  <view class="docs-demo-stack">
    <view class="docs-demo-section-label">
      <text>异步数据源</text>
      <text class="docs-demo-section-label__value">城市即叶子</text>
    </view>

    <view class="docs-demo-toolbar docs-demo-toolbar--space">
      <button
        class="docs-demo-chip"
        :class="{ 'is-active': failFirst }"
        @click="failFirst = !failFirst">
        <view class="docs-demo-chip__dot"></view>
        模拟首次失败
      </button>
      <button class="docs-demo-chip" @click="resetDemo">
        重新演示
      </button>
    </view>

    <view class="docs-demo-card">
      <view class="docs-demo-card__header">
        <text class="docs-demo-card__title">区域选择</text>
        <view class="docs-demo-card__meta">
          <view class="docs-demo-card__meta-dot"></view>
          按需请求
        </view>
      </view>
      <uni-tree-view
        v-if="treeVisible"
        ref="treeRef"
        load-mode
        selectable
        only-radio-leaf
        check-on-click-node
        :data="rootData"
        :load-api="loadChildren"
        :is-leaf-fn="isCityLeaf"
        theme-color="#299764"
        @load="onLoad"
        @load-error="onLoadError"></uni-tree-view>
    </view>

    <view class="docs-demo-status">
      <view class="docs-demo-status__icon"></view>
      <view class="docs-demo-status__content">
        <text class="docs-demo-status__title">{{ loadTitle }}</text>
        <text class="docs-demo-status__detail">{{ loadDetail }}</text>
        <view v-if="failedNode" class="docs-demo-status__actions">
          <button class="docs-demo-chip is-active" @click="retryFailedNode">
            重试「{{ failedNode.label }}」
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import UniTreeView from "uni-tree-view";
import type { TreeDataItem, UniTreeViewExposed } from "uni-tree-view";
import { computed, nextTick, shallowRef } from "vue";

interface AreaItem {
  id: string;
  label: string;
  append?: string;
  type: "region" | "city";
}

const treeVisible = shallowRef(true);
const treeRef = shallowRef<UniTreeViewExposed | null>(null);
const loading = shallowRef(false);
const failFirst = shallowRef(false);
const failedNode = shallowRef<{ id: string | number; label: string } | null>(null);
const loadMessage = shallowRef("等待展开区域节点");
// 首次失败演示：记录已失败过一次的节点，重试时放行
const failedOnceKeys = new Set<string>();

const rootData: AreaItem[] = [
  { id: "north", label: "华北区域", append: "2 城市", type: "region" },
  { id: "east", label: "华东区域", append: "3 城市", type: "region" },
  { id: "south", label: "华南区域", append: "2 城市", type: "region" }
];

const childrenMap: Record<string, AreaItem[]> = {
  north: [
    { id: "beijing", label: "北京", type: "city" },
    { id: "tianjin", label: "天津", type: "city" }
  ],
  east: [
    { id: "shanghai", label: "上海", type: "city" },
    { id: "hangzhou", label: "杭州", type: "city" },
    { id: "suzhou", label: "苏州", type: "city" }
  ],
  south: [
    { id: "guangzhou", label: "广州", type: "city" },
    { id: "shenzhen", label: "深圳", type: "city" }
  ]
};

const loadTitle = computed(() => loading.value ? "正在请求子节点" : loadMessage.value);
const loadDetail = computed(() => {
  if (loading.value) {
    return "模拟 650ms 的异步数据请求";
  }
  if (failedNode.value) {
    return "点击「重试」或再次点击该节点箭头都会重新调用 load-api";
  }
  return "已加载的节点再次展开不会重复请求";
});

function isCityLeaf(item: TreeDataItem) {
  return item.type === "city";
}

async function loadChildren(node: { id: string | number; label: string }) {
  loading.value = true;
  loadMessage.value = `正在加载「${node.label}」`;
  await new Promise((resolve) => setTimeout(resolve, 650));
  loading.value = false;

  if (failFirst.value && !failedOnceKeys.has(String(node.id))) {
    failedOnceKeys.add(String(node.id));
    throw new Error(`模拟「${node.label}」加载失败`);
  }
  return childrenMap[String(node.id)] ?? [];
}

function onLoad(payload: { node: { id: string | number; label: string }; children: unknown[] }) {
  loadMessage.value = `「${payload.node.label}」已加载 ${payload.children.length} 项`;
  if (failedNode.value && failedNode.value.id === payload.node.id) {
    failedNode.value = null;
  }
}

function onLoadError(payload: { node: { id: string | number; label: string } }) {
  failedNode.value = { id: payload.node.id, label: payload.node.label };
  loadMessage.value = `「${payload.node.label}」加载失败`;
}

async function retryFailedNode() {
  if (!failedNode.value || loading.value) {
    return;
  }
  try {
    await treeRef.value?.retryLoad(failedNode.value.id);
  } catch {
    // 再次失败会重新触发 load-error，状态栏保持失败态
  }
}

async function resetDemo() {
  treeVisible.value = false;
  loading.value = false;
  failedNode.value = null;
  failedOnceKeys.clear();
  loadMessage.value = "案例已重置，等待重新展开";
  await nextTick();
  treeVisible.value = true;
}
</script>

<style lang="scss">
@use "./demo.scss";
</style>