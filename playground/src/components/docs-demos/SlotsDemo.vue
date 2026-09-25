<template>
  <view class="docs-demo-stack">
    <view class="docs-demo-section-label">
      <text>业务化呈现</text>
      <text class="docs-demo-section-label__value">3 个插槽</text>
    </view>

    <view class="docs-demo-card">
      <view class="docs-demo-card__header">
        <text class="docs-demo-card__title">项目成员</text>
        <view class="docs-demo-card__meta">
          <view class="docs-demo-card__meta-dot"></view>
          自定义节点
        </view>
      </view>
      <uni-tree-view
        v-model="checkedValue"
        selectable
        multiple
        default-expand-all
        :data="demoTreeData"
        theme-color="#299764">
        <template #icon="{ node }">
          <wd-icon
            :name="node.isLeaf ? 'user' : 'folder'"
            size="16px"
            color="#299764"></wd-icon>
        </template>
        <template #label="{ node, data }">
          <view class="docs-demo-node-label">
            <text :class="{ 'is-group': !node.isLeaf }">
              {{ node.label }}
            </text>
            <text v-if="data.isNew" class="docs-demo-badge">
              NEW
            </text>
          </view>
        </template>
        <template #append="{ data }">
          <text v-if="data.append" class="docs-demo-append">
            {{ data.append }}
          </text>
        </template>
      </uni-tree-view>
    </view>

    <view class="docs-demo-status">
      <view class="docs-demo-status__icon"></view>
      <view class="docs-demo-status__content">
        <text class="docs-demo-status__title">{{ checkedText }}</text>
        <text class="docs-demo-status__detail">icon、label、append 可独立组合</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import UniTreeView from "uni-tree-view";
import { computed, shallowRef } from "vue";
import type { DemoTreeKey } from "./data";
import { demoTreeData } from "./data";

const checkedValue = shallowRef<DemoTreeKey[]>([]);
const checkedText = computed(() => checkedValue.value.length
  ? `已选择 ${checkedValue.value.length} 个定制节点`
  : "点击复选框体验定制节点");
</script>

<style lang="scss">
@use "./demo.scss";
</style>