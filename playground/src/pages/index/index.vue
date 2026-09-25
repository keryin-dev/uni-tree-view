<template>
  <app-page>
    <view class="page">
      <view class="page__hero">
        <view class="page__hero-main">
          <image
            class="page__logo"
            src="/static/uni-tree-view-logo.png"
            mode="aspectFit"></image>
          <view class="page__hero-text">
            <text class="page__title">
              Uni Tree View
            </text>
            <text class="page__subtitle">
              轻量、独立的跨端树形选择组件
            </text>
          </view>
        </view>
        <wd-tag type="primary" variant="plain" round>
          v{{ version }}
        </wd-tag>
      </view>

      <view class="demo-card">
        <view class="demo-card__header">
          <view class="demo-card__header-main">
            <text class="demo-card__title">
              组织架构 · 综合演示
            </text>
            <text class="demo-card__desc">
              搜索过滤 · 多选联动 · 实例方法 · 主题色
            </text>
          </view>
          <wd-tag v-if="filterValue" type="primary" variant="plain">
            命中 {{ filterCount }}
          </wd-tag>
          <wd-tag v-else-if="checkedValue.length" type="primary" variant="plain">
            已选 {{ checkedValue.length }}
          </wd-tag>
        </view>

        <wd-search
          v-model="filterValue"
          custom-style="--wot-search-padding: 10px 0 0; --wot-search-bg: transparent;"
          placeholder="搜索部门或成员"
          hide-cancel
          placeholder-left></wd-search>

        <view class="demo-toolbar">
          <button class="demo-chip" @click="treeRef?.expandAll()">
            展开全部
          </button>
          <button class="demo-chip" @click="treeRef?.collapseAll()">
            收起全部
          </button>
          <button class="demo-chip" @click="checkAll">
            全选
          </button>
          <button class="demo-chip" @click="clearChecked">
            清空
          </button>
          <view class="demo-toolbar__spacer"></view>
          <view class="demo-swatches">
            <view
              v-for="color in themeColors"
              :key="color"
              class="demo-swatch"
              :class="{ 'is-active': themeColor === color }"
              :style="{ background: color, color }"
              @click="themeColor = color"></view>
          </view>
        </view>

        <uni-tree-view
          ref="treeRef"
          v-model="checkedValue"
          selectable
          multiple
          check-on-click-node
          expand-checked
          :theme-color="themeColor"
          :data="orgTreeData"
          :tree-props="demoTreeProps"
          :filter-value="filterValue"
          :show-path="Boolean(filterValue)"
          path-separator=" / "
          :default-expanded-keys="['rd-fe']"
          @check-change="handleCheckChange"
          @expand-change="handleExpandChange"
          @filter-change="filterCount = $event.matchedKeys.length"></uni-tree-view>

        <view class="demo-status">
          <view class="demo-status__dot" :style="{ background: themeColor, boxShadow: 'none' }"></view>
          <view class="demo-status__content">
            <text class="demo-status__title">{{ checkedSummary }}</text>
            <text class="demo-status__detail">{{ latestAction }}</text>
          </view>
        </view>
      </view>

      <wd-cell-group border custom-class="demo-cells page__cells">
        <wd-cell
          v-for="item in exampleEntries"
          :key="item.tab"
          :title="item.title"
          :label="item.label"
          is-link
          clickable
          @click="goExamples(item.tab)"></wd-cell>
      </wd-cell-group>

      <view class="demo-card page__virtual-card">
        <view class="demo-card__header">
          <view class="demo-card__header-main">
            <text class="demo-card__title">
              大数据虚拟渲染
            </text>
            <text class="demo-card__desc">
              {{ largeTreeSummary }}
            </text>
          </view>
          <view class="demo-card__actions">
            <wd-button
              v-if="showLargeTree"
              size="small"
              type="primary"
              variant="plain"
              @click="locateLargeTarget">
              定位 6 级节点
            </wd-button>
            <wd-button
              size="small"
              type="primary"
              :variant="showLargeTree ? 'plain' : 'base'"
              @click="toggleLargeTree">
              {{ showLargeTree ? "关闭" : "开启" }}
            </wd-button>
          </view>
        </view>

        <view v-if="showLargeTree" class="demo-tree-frame page__large-tree">
          <wd-search
            v-model="largeFilterValue"
            custom-style="--wot-search-padding: 0 0 10px; --wot-search-bg: transparent;"
            placeholder="在万级节点中筛选"
            hide-cancel
            placeholder-left></wd-search>
          <uni-tree-view
            ref="largeTreeRef"
            v-model="largeCheckedValue"
            selectable
            multiple
            check-on-click-node
            virtual
            default-expand-all
            highlight-filter
            :theme-color="themeColor"
            :virtual-height="560"
            :virtual-item-height="36"
            :virtual-overscan="12"
            :data="largeTreeData"
            :tree-props="demoTreeProps"
            :filter-value="largeFilterValue"
            @check-change="handleLargeChange"
            @expand-change="handleLargeExpandChange"
            @filter-change="handleLargeFilterChange"></uni-tree-view>
        </view>
      </view>

      <view class="demo-card page__virtual-card">
        <view class="demo-card__header">
          <view class="demo-card__header-main">
            <text class="demo-card__title">
              虚拟渲染 + 懒加载
            </text>
            <text class="demo-card__desc">
              80 个异步根节点 · 展开时按需加载 16 个子节点
            </text>
          </view>
          <wd-tag type="primary" variant="plain">
            virtual + load-mode
          </wd-tag>
        </view>

        <view class="demo-tree-frame page__lazy-virtual-tree">
          <uni-tree-view
            v-model="lazyVirtualCheckedValue"
            selectable
            multiple
            check-on-click-node
            virtual
            load-mode
            :theme-color="themeColor"
            :virtual-height="320"
            :virtual-item-height="36"
            :virtual-overscan="8"
            :data="lazyVirtualTreeData"
            :load-api="lazyVirtualLoader.load"
            @load="handleLazyVirtualLoad"
            @load-error="handleLazyVirtualLoadError"></uni-tree-view>
        </view>

        <view class="demo-status">
          <view class="demo-status__dot" :style="{ background: themeColor, boxShadow: 'none' }"></view>
          <view class="demo-status__content">
            <text class="demo-status__title">{{ lazyVirtualMessage }}</text>
            <text class="demo-status__detail">
              “异步区域 1”首次加载会失败，再点箭头即可重试。
            </text>
          </view>
        </view>
      </view>

      <wd-gap height="24px" bg-color="transparent"></wd-gap>
    </view>
  </app-page>
</template>

<script setup lang='ts'>
import UniTreeView from "uni-tree-view";
import type {
  TreeKey,
  TreeLoadErrorPayload,
  TreeLoadPayload,
  UniTreeViewExposed
} from "uni-tree-view";
import { computed, shallowRef } from "vue";
import AppPage from "@/components/appPage/index.vue";
import { demoTreeProps, findTreeLabels, orgTreeData } from "@/mockData/demoTrees";
import { createLargeTreeData, LARGE_TREE_DEFAULTS } from "@/utils/largeTreeData";
import {
  createVirtualLazyLoader,
  createVirtualLazyRootData
} from "@/utils/lazyVirtualTreeData";

interface DemoTreeNode {
  id: string;
  label: string;
  children?: DemoTreeNode[];
}

const version = __UNI_TREE_VIEW_VERSION__;

// ==================== 综合演示 ====================
const themeColors = ["#299764", "#2563eb", "#ea580c", "#7c3aed"];
const themeColor = shallowRef(themeColors[0]);
const treeRef = shallowRef<UniTreeViewExposed | null>(null);
const filterValue = shallowRef("");
const filterCount = shallowRef(0);
const checkedValue = shallowRef<TreeKey[]>(["rd-fe-1"]);
const latestAction = shallowRef("等待操作");

const exampleEntries = [
  { tab: "selection", title: "选择模式", label: "单选 / 叶子单选 / 父子联动 / 严格模式" },
  { tab: "lazy", title: "懒加载", label: "load-api / is-leaf-fn / 失败重试" },
  { tab: "slots", title: "插槽定制", label: "icon / label / append / empty" },
  { tab: "popup", title: "弹窗选择", label: "右侧勾选 / 草稿确认回填" }
] as const;

const checkedSummary = computed(() => {
  const count = checkedValue.value.length;
  if (!count) {
    return "暂未选中节点";
  }
  const labels = findTreeLabels(orgTreeData, checkedValue.value);
  const shown = labels.slice(0, 3).join("、");
  return count > 3 ? `已选 ${count} 项：${shown} 等` : `已选 ${count} 项：${shown}`;
});

function handleCheckChange(payload: any) {
  latestAction.value = `check-change：「${payload.node.label}」，共 ${payload.keys.length} 项`;
}

function handleExpandChange(payload: any) {
  latestAction.value = `${payload.expanded ? "展开" : "收起"}「${payload.node.label}」`;
}

function checkAll() {
  if (!treeRef.value) {
    return;
  }

  const selectableKeys = [
    ...treeRef.value.getUncheckedNodes(),
    ...treeRef.value.getHalfCheckedNodes()
  ]
    .filter((node) => !node.disabled)
    .map((node) => node.id);
  treeRef.value.setCheckedKeys(selectableKeys, true);
}

function clearChecked() {
  if (!treeRef.value) {
    return;
  }

  const selectableKeys = treeRef.value.getCheckedNodes()
    .filter((node) => !node.disabled)
    .map((node) => node.id);
  treeRef.value.setCheckedKeys(selectableKeys, false);
}

function goExamples(tab: string) {
  uni.navigateTo({ url: `/pages/examples/index?tab=${tab}` });
}

// ==================== 大数据虚拟渲染 ====================
const showLargeTree = shallowRef(false);
const largeTreeRef = shallowRef<UniTreeViewExposed | null>(null);
const largeTreeData = shallowRef<DemoTreeNode[]>([]);
const largeCheckedValue = shallowRef<TreeKey[]>([]);
const largeFilterValue = shallowRef("");
const largeNodeCount = shallowRef(0);
const largeTargetKey = shallowRef("");
const largeTargetLabel = shallowRef("");
const largeLatestAction = shallowRef("未开启");

const largeTreeSummary = computed(() => {
  if (!showLargeTree.value) {
    return `点击生成 ${LARGE_TREE_DEFAULTS.total.toLocaleString()} 个节点 / 2-6 层随机分支`;
  }

  return `${largeNodeCount.value.toLocaleString()} 个节点 / 2-6 层 · ${largeLatestAction.value}`;
});

function toggleLargeTree() {
  if (showLargeTree.value) {
    showLargeTree.value = false;
    largeTreeData.value = [];
    largeCheckedValue.value = [];
    largeFilterValue.value = "";
    largeNodeCount.value = 0;
    largeTargetKey.value = "";
    largeTargetLabel.value = "";
    largeLatestAction.value = "已关闭";
    return;
  }

  const largeTree = createLargeTreeData();
  largeTreeData.value = largeTree.data;
  largeNodeCount.value = largeTree.count;
  largeTargetKey.value = largeTree.targetKey;
  largeTargetLabel.value = largeTree.targetLabel;
  largeLatestAction.value = "已生成";
  showLargeTree.value = true;
}

function handleLargeChange(payload: any) {
  largeLatestAction.value = `选中 ${payload.keys.length} 项`;
}

function handleLargeExpandChange(payload: any) {
  largeLatestAction.value = `${payload.expanded ? "展开" : "收起"} ${payload.node.id}`;
}

function handleLargeFilterChange(payload: any) {
  largeLatestAction.value = largeFilterValue.value
    ? `筛选命中 ${payload.matchedKeys.length} 项`
    : "已清空筛选";
}

async function locateLargeTarget() {
  const located = await largeTreeRef.value?.scrollToKey(largeTargetKey.value, { expandParents: true });
  largeLatestAction.value = located ? `已请求定位 ${largeTargetLabel.value}` : "目标节点定位失败";
}

// ==================== 虚拟渲染 + 懒加载 ====================
const lazyVirtualTreeData = shallowRef(createVirtualLazyRootData());
const lazyVirtualCheckedValue = shallowRef<TreeKey[]>([]);
const lazyVirtualLoader = createVirtualLazyLoader();
const lazyVirtualMessage = shallowRef("展开任一异步区域，仅请求该节点的子级");

function handleLazyVirtualLoad(payload: TreeLoadPayload) {
  lazyVirtualMessage.value = `已加载「${payload.node.label}」的 ${payload.children.length} 个子节点`;
}

function handleLazyVirtualLoadError(payload: TreeLoadErrorPayload) {
  lazyVirtualMessage.value = `「${payload.node.label}」加载失败，等待重试`;
}
</script>

<style scoped lang='scss'>
.page {
  min-height: 100vh;
  padding: 12px 12px 0;
  background: var(--wot-filled-bottom, #f6f7fb);
}

.page__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 4px 16px;
}

.page__hero-main {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  gap: 10px;
}

.page__logo {
  flex: none;
  width: 48px;
  height: 48px;
}

.page__title,
.page__subtitle {
  display: block;
}

.page__title {
  color: var(--wot-text-main, #111827);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
}

.page__subtitle {
  margin-top: 6px;
  color: var(--wot-text-auxiliary, #667085);
  font-size: 13px;
}

.page__virtual-card {
  margin-top: 12px;
}

.page__large-tree {
  height: 560px;
}

.page__lazy-virtual-tree {
  height: 320px;
}

:deep(.page__cells) {
  margin-top: 12px;
}
</style>