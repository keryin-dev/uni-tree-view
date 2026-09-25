<template>
  <app-page>
    <view class="page">
      <wd-tabs
        v-model="activeTab"
        :offset-top="-1"
        custom-class="page__tabs"
        custom-style="--wot-tabs-nav-bg: var(--wot-filled-oppo, #ffffff); --wot-tabs-nav-item-font-size: 14px;"
        sticky>
        <!-- ==================== 选择模式 ==================== -->
        <wd-tab title="选择模式" name="selection">
          <view class="page__panel">
            <view class="demo-card">
              <view class="demo-card__header">
                <view class="demo-card__header-main">
                  <text class="demo-card__title">
                    成员权限
                  </text>
                  <text class="demo-card__desc">
                    {{ modeDescription }}
                  </text>
                </view>
              </view>

              <view class="page__segment">
                <view
                  v-for="option in selectionModeOptions"
                  :key="option"
                  class="page__segment-item"
                  :class="{ 'is-active': selectionMode === option }"
                  @click="selectionMode = option">
                  <text class="page__segment-label">{{ option }}</text>
                </view>
              </view>

              <uni-tree-view
                v-if="selectionMode === '单选'"
                v-model="singleValue"
                selectable
                check-on-click-node
                default-expand-all
                theme-color="#299764"
                :data="orgTreeData"
                :tree-props="demoTreeProps"></uni-tree-view>
              <uni-tree-view
                v-else-if="selectionMode === '叶子单选'"
                v-model="singleLeafValue"
                selectable
                only-radio-leaf
                check-on-click-node
                default-expand-all
                theme-color="#299764"
                :data="orgTreeData"
                :tree-props="demoTreeProps"></uni-tree-view>
              <uni-tree-view
                v-else-if="selectionMode === '父子联动'"
                ref="selectionTreeRef"
                v-model="multipleValue"
                selectable
                multiple
                check-on-click-node
                default-expand-all
                theme-color="#299764"
                :data="orgTreeData"
                :tree-props="demoTreeProps"></uni-tree-view>
              <uni-tree-view
                v-else
                ref="selectionTreeRef"
                v-model="strictValue"
                selectable
                multiple
                check-strictly
                check-on-click-node
                default-expand-all
                theme-color="#299764"
                :data="orgTreeData"
                :tree-props="demoTreeProps"></uni-tree-view>

              <view v-if="isMultipleMode" class="demo-toolbar">
                <button class="demo-chip" @click="checkDesignTeam">
                  选中设计组
                </button>
                <button class="demo-chip" @click="clearSelectionChecked">
                  清空选中
                </button>
              </view>

              <view class="demo-status">
                <view class="demo-status__dot"></view>
                <view class="demo-status__content">
                  <text class="demo-status__title">{{ selectionTitle }}</text>
                  <text class="demo-status__detail">{{ selectionDetail }}</text>
                </view>
              </view>
            </view>
          </view>
        </wd-tab>

        <!-- ==================== 懒加载 ==================== -->
        <wd-tab title="懒加载" name="lazy">
          <view class="page__panel">
            <view class="demo-card">
              <view class="demo-card__header">
                <view class="demo-card__header-main">
                  <text class="demo-card__title">
                    异步加载子节点
                  </text>
                  <text class="demo-card__desc">
                    模拟 600ms 网络请求，城市节点由 is-leaf-fn 识别为叶子
                  </text>
                </view>
                <wd-tag type="primary" variant="plain">
                  {{ lazyStatus }}
                </wd-tag>
              </view>

              <view class="demo-toolbar">
                <button
                  class="demo-chip"
                  :class="{ 'is-active': lazyFailFirst }"
                  @click="lazyFailFirst = !lazyFailFirst">
                  <view class="demo-chip__dot"></view>
                  模拟首次失败
                </button>
                <button class="demo-chip" @click="resetLazyDemo">
                  重新演示
                </button>
              </view>

              <uni-tree-view
                v-if="lazyTreeVisible"
                ref="lazyTreeRef"
                v-model="lazyValue"
                selectable
                multiple
                load-mode
                theme-color="#299764"
                :data="lazyRegionData"
                :tree-props="demoTreeProps"
                :load-api="mockLoadApi"
                :is-leaf-fn="isLazyLeaf"
                @load="onLazyLoad"
                @load-error="onLazyLoadError"></uni-tree-view>

              <view class="demo-status">
                <view class="demo-status__dot"></view>
                <view class="demo-status__content">
                  <text class="demo-status__title">{{ lazyMessage }}</text>
                  <text class="demo-status__detail">{{ lazyDetail }}</text>
                  <view v-if="lazyFailedNode" class="demo-status__actions">
                    <button class="demo-chip is-active" @click="retryLazyNode">
                      重试「{{ lazyFailedNode.label }}」
                    </button>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </wd-tab>

        <!-- ==================== 插槽定制 ==================== -->
        <wd-tab title="插槽定制" name="slots">
          <view class="page__panel">
            <view class="demo-card">
              <view class="demo-card__header">
                <view class="demo-card__header-main">
                  <text class="demo-card__title">
                    icon / label / append 插槽
                  </text>
                  <text class="demo-card__desc">
                    文件夹图标 + NEW 徽标 + 条目计数，可独立组合
                  </text>
                </view>
              </view>
              <uni-tree-view
                theme-color="#299764"
                default-expand-all
                :data="docTreeData"
                :tree-props="demoTreeProps">
                <template #icon="{ node }">
                  <wd-icon
                    :name="node.isLeaf ? 'file' : 'folder'"
                    size="17px"
                    color="#299764"></wd-icon>
                </template>
                <template #label="{ node, data }">
                  <view class="page__slot-label">
                    <text :class="{ 'page__slot-label--group': !node.isLeaf }">
                      {{ node.label }}
                    </text>
                    <wd-tag
                      v-if="data.isNew"
                      type="danger"
                      variant="plain"
                      round>
                      NEW
                    </wd-tag>
                  </view>
                </template>
                <template #append="{ data }">
                  <wd-tag
                    v-if="data.count"
                    type="primary"
                    variant="plain"
                    round>
                    {{ data.count }}
                  </wd-tag>
                </template>
              </uni-tree-view>
            </view>

            <view class="demo-card">
              <view class="demo-card__header">
                <view class="demo-card__header-main">
                  <text class="demo-card__title">
                    空状态插槽
                  </text>
                </view>
              </view>
              <uni-tree-view :data="[]" theme-color="#299764">
                <template #empty>
                  <wd-empty tip="这里什么都没有"></wd-empty>
                </template>
              </uni-tree-view>
            </view>
          </view>
        </wd-tab>

        <!-- ==================== 弹窗选择 ==================== -->
        <wd-tab title="弹窗选择" name="popup">
          <view class="page__panel">
            <view class="demo-card">
              <view class="demo-card__header">
                <view class="demo-card__header-main">
                  <text class="demo-card__title">
                    底部弹窗选择器（组合 wd-popup）
                  </text>
                  <text class="demo-card__desc">
                    cell 唤起 + 右侧勾选 + 草稿确认回填，取消不影响已选
                  </text>
                </view>
              </view>
              <wd-cell
                title="选择部门"
                :value="popupDisplayText"
                is-link
                clickable
                @click="openPopup"></wd-cell>

              <view v-if="popupLabels.length" class="demo-tags">
                <text v-for="label in popupLabels" :key="label" class="demo-tag">
                  {{ label }}
                </text>
              </view>
            </view>
          </view>

          <wd-popup
            v-model="showPopup"
            position="bottom"
            safe-area-inset-bottom
            custom-class="page__popup">
            <view class="page__popup-bar">
              <text class="page__popup-cancel" @click="showPopup = false">
                取消
              </text>
              <text class="page__popup-title">
                选择部门
              </text>
              <text class="page__popup-confirm" @click="confirmPopup">
                确定
              </text>
            </view>
            <view class="page__popup-body">
              <uni-tree-view
                v-model="popupDraftValue"
                selectable
                multiple
                check-on-click-node
                selection-placement="right"
                theme-color="#299764"
                default-expand-all
                :data="orgTreeData"
                :tree-props="demoTreeProps"></uni-tree-view>
            </view>
          </wd-popup>
        </wd-tab>
      </wd-tabs>
      <wd-gap height="24px" bg-color="transparent"></wd-gap>
    </view>
  </app-page>
</template>

<script setup lang='ts'>
import { onLoad } from "@dcloudio/uni-app";
import UniTreeView from "uni-tree-view";
import type { TreeDataItem, UniTreeViewExposed } from "uni-tree-view";
import { computed, nextTick, ref, shallowRef } from "vue";
import AppPage from "@/components/appPage/index.vue";
import {
  demoTreeProps,
  docTreeData,
  findTreeLabels,
  lazyRegionChildren,
  lazyRegionData,
  orgTreeData
} from "@/mockData/demoTrees";

const tabNames = ["selection", "lazy", "slots", "popup"];
const activeTab = ref("selection");

onLoad((options) => {
  if (options?.tab && tabNames.includes(options.tab)) {
    activeTab.value = options.tab;
  }
});

// ==================== 选择模式 ====================
type SelectionMode = "单选" | "叶子单选" | "父子联动" | "严格模式";

const selectionModeOptions: SelectionMode[] = ["单选", "叶子单选", "父子联动", "严格模式"];
const selectionMode = ref<SelectionMode>("父子联动");
const selectionTreeRef = shallowRef<UniTreeViewExposed | null>(null);
const singleValue = shallowRef<string | number | null>("rd-fe");
const singleLeafValue = shallowRef<string | number | null>("rd-fe-1");
const multipleValue = shallowRef<Array<string | number>>(["rd-design-1"]);
const strictValue = shallowRef<Array<string | number>>(["rd-be"]);

const isMultipleMode = computed(() => selectionMode.value === "父子联动" || selectionMode.value === "严格模式");

const selectedKeys = computed<Array<string | number>>(() => {
  switch (selectionMode.value) {
    case "单选":
      return singleValue.value === null ? [] : [singleValue.value];
    case "叶子单选":
      return singleLeafValue.value === null ? [] : [singleLeafValue.value];
    case "父子联动":
      return multipleValue.value;
    default:
      return strictValue.value;
  }
});

const selectionTitle = computed(() => {
  const labels = findTreeLabels(orgTreeData, selectedKeys.value);
  if (!labels.length) {
    return "尚未选择";
  }
  if (!isMultipleMode.value) {
    return `当前选择：${labels[0]}`;
  }
  const shown = labels.slice(0, 3).join("、");
  return labels.length > 3 ? `已选 ${labels.length} 项：${shown} 等` : `已选 ${labels.length} 项：${shown}`;
});

const modeDescription = computed(() => ({
  "单选": "任意节点可单选，父子互不影响",
  "叶子单选": "only-radio-leaf：仅叶子节点参与单选",
  "父子联动": "multiple：父子自动联动并展示半选",
  "严格模式": "check-strictly：每个节点独立选择"
})[selectionMode.value]);

const selectionDetail = computed(() => isMultipleMode.value
  ? "「选中设计组 / 清空选中」通过 ref 调用 setCheckedKeys"
  : "v-model 为单个 key，再次点击可取消选择");

function checkDesignTeam() {
  selectionTreeRef.value?.setCheckedKeys("rd-design", true);
}

function clearSelectionChecked() {
  if (!selectionTreeRef.value) {
    return;
  }

  const selectableKeys = selectionTreeRef.value.getCheckedNodes()
    .filter((node) => !node.disabled)
    .map((node) => node.id);
  selectionTreeRef.value.setCheckedKeys(selectableKeys, false);
}

// ==================== 懒加载 ====================
const lazyTreeVisible = shallowRef(true);
const lazyTreeRef = shallowRef<UniTreeViewExposed | null>(null);
const lazyValue = shallowRef<Array<string | number>>([]);
const lazyStatus = shallowRef("待展开");
const lazyMessage = shallowRef("展开区域节点，观察异步加载过程");
const lazyLoading = shallowRef(false);
const lazyFailFirst = shallowRef(false);
const lazyFailedNode = shallowRef<{ id: string | number; label: string } | null>(null);
// 「模拟首次失败」：记录已失败过一次的节点，重试时放行
const lazyFailedOnceKeys = new Set<string>();

const lazyDetail = computed(() => {
  if (lazyLoading.value) {
    return "模拟 600ms 的异步数据请求";
  }
  if (lazyFailedNode.value) {
    return "点击「重试」或再次点击该节点箭头都会重新调用 load-api";
  }
  return "已加载的节点再次展开不会重复请求";
});

function isLazyLeaf(item: TreeDataItem) {
  return item.type === "city";
}

async function mockLoadApi(node: { id: string | number; label: string }) {
  lazyLoading.value = true;
  lazyStatus.value = "加载中…";
  lazyMessage.value = `正在加载「${node.label}」`;
  await new Promise((resolve) => setTimeout(resolve, 600));
  lazyLoading.value = false;

  if (lazyFailFirst.value && !lazyFailedOnceKeys.has(String(node.id))) {
    lazyFailedOnceKeys.add(String(node.id));
    throw new Error(`模拟「${node.label}」加载失败`);
  }
  return lazyRegionChildren[String(node.id)] ?? [];
}

function onLazyLoad(payload: any) {
  lazyStatus.value = `已加载 ${payload.children.length} 项`;
  lazyMessage.value = `「${payload.node.label}」已加载 ${payload.children.length} 项`;
  if (lazyFailedNode.value && lazyFailedNode.value.id === payload.node.id) {
    lazyFailedNode.value = null;
  }
}

function onLazyLoadError(payload: any) {
  lazyStatus.value = "加载失败";
  lazyMessage.value = `「${payload.node.label}」加载失败`;
  lazyFailedNode.value = { id: payload.node.id, label: payload.node.label };
}

async function retryLazyNode() {
  if (!lazyFailedNode.value || lazyLoading.value) {
    return;
  }
  try {
    await lazyTreeRef.value?.retryLoad(lazyFailedNode.value.id);
  } catch {
    // 再次失败会重新触发 load-error，状态栏保持失败态
  }
}

async function resetLazyDemo() {
  lazyTreeVisible.value = false;
  lazyValue.value = [];
  lazyLoading.value = false;
  lazyFailedNode.value = null;
  lazyFailedOnceKeys.clear();
  lazyStatus.value = "待展开";
  lazyMessage.value = "案例已重置，等待重新展开";
  await nextTick();
  lazyTreeVisible.value = true;
}

// ==================== 弹窗选择 ====================
const showPopup = ref(false);
const popupValue = shallowRef<Array<string | number>>([]);
const popupDraftValue = shallowRef<Array<string | number>>([]);

const popupDisplayText = computed(() => {
  return popupValue.value.length ? `已选 ${popupValue.value.length} 项` : "请选择";
});

const popupLabels = computed(() => findTreeLabels(orgTreeData, popupValue.value));

function openPopup() {
  // 弹窗内操作草稿值，确认时才回填，取消不影响已选
  popupDraftValue.value = [...popupValue.value];
  showPopup.value = true;
}

function confirmPopup() {
  popupValue.value = [...popupDraftValue.value];
  showPopup.value = false;
}
</script>

<style scoped lang='scss'>
.page {
  min-height: 100vh;
  background: var(--wot-filled-bottom, #f6f7fb);
}

.page__panel {
  padding: 12px;
}

.page__segment {
  display: flex;
  gap: 3px;
  padding: 3px;
  margin: 10px 0 6px;
  background: var(--wot-filled-content, #f2f3f5);
  border-radius: 6px;
}

.page__segment-item {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 28px;
  color: var(--wot-text-secondary, #4b5563);
  font-size: 13px;
  line-height: 1;
  border-radius: 4px;
  box-sizing: border-box;
}

.page__segment-item.is-active {
  color: var(--wot-primary-6, #299764);
  font-weight: 600;
  background: var(--wot-filled-oppo, #ffffff);
  box-shadow: 0 1px 4px rgba(16, 24, 40, 0.08);
}

.page__segment-label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.page__slot-label {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.page__slot-label--group {
  font-weight: 600;
}

:deep(.page__tabs .wd-tabs__nav) {
  box-shadow: 0 1px 0 var(--wot-border-light, #e4e7ec);
}

// 弹窗
:deep(.page__popup) {
  border-radius: 16px 16px 0 0;
}

.page__popup-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--wot-border-light, #e4e7ec);
}

.page__popup-title {
  color: var(--wot-text-main, #111827);
  font-size: 15px;
  font-weight: 600;
}

.page__popup-cancel {
  color: var(--wot-text-auxiliary, #667085);
  font-size: 14px;
}

.page__popup-confirm {
  color: var(--wot-primary-6, #299764);
  font-size: 14px;
  font-weight: 600;
}

.page__popup-body {
  height: 56vh;
  padding: 4px 0;
  overflow: hidden;
}
</style>